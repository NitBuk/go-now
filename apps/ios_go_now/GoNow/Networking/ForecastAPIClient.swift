import Foundation

protocol ForecastFetching: Sendable {
    func fetchScores(days: Int) async throws -> ScoredForecast
}

protocol HealthFetching: Sendable {
    func fetchHealth() async throws -> HealthResponse
}

protocol HTTPSession: Sendable {
    func data(for request: URLRequest) async throws -> (Data, URLResponse)
}

extension URLSession: HTTPSession {}

struct URLSessionForecastClient: ForecastFetching, HealthFetching {
    let baseURL: URL
    let areaID: String
    let session: HTTPSession
    let decoder: JSONDecoder

    static var live: URLSessionForecastClient {
        URLSessionForecastClient(
            baseURL: AppConfig.apiBaseURL,
            areaID: "tel_aviv_coast",
            session: URLSession.shared,
            decoder: .goNowAPI
        )
    }

    func fetchScores(days: Int = 7) async throws -> ScoredForecast {
        var components = URLComponents(url: baseURL.appending(path: "/v1/public/scores"), resolvingAgainstBaseURL: false)
        components?.queryItems = [
            URLQueryItem(name: "area_id", value: areaID),
            URLQueryItem(name: "days", value: "\(days)")
        ]

        guard let url = components?.url else {
            throw ForecastAPIError.invalidURL
        }

        return try await requestJSON(url: url)
    }

    func fetchHealth() async throws -> HealthResponse {
        let url = baseURL.appending(path: "/v1/public/health")
        return try await requestJSON(url: url)
    }

    private func requestJSON<Response: Decodable>(url: URL) async throws -> Response {
        var request = URLRequest(url: url)
        request.timeoutInterval = 20
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw ForecastAPIError.invalidResponse
        }

        guard (200..<300).contains(httpResponse.statusCode) else {
            if let envelope = try? decoder.decode(APIErrorEnvelope.self, from: data) {
                throw ForecastAPIError.server(
                    statusCode: httpResponse.statusCode,
                    code: envelope.error.code,
                    message: envelope.error.message
                )
            }
            throw ForecastAPIError.httpStatus(httpResponse.statusCode)
        }

        do {
            return try decoder.decode(Response.self, from: data)
        } catch {
            throw ForecastAPIError.decoding(error.localizedDescription)
        }
    }
}

enum AppConfig {
    static var apiBaseURL: URL {
        if let override = ProcessInfo.processInfo.environment["GO_NOW_API_BASE_URL"],
           let url = URL(string: override) {
            return url
        }
        if let index = CommandLine.arguments.firstIndex(of: "--api-base-url"),
           CommandLine.arguments.indices.contains(index + 1),
           let url = URL(string: CommandLine.arguments[index + 1]) {
            return url
        }
        return URL(string: "https://api-fastapi-841486153499.europe-west1.run.app")!
    }
}

struct APIErrorEnvelope: Decodable {
    let error: APIErrorDetail
    let requestId: String?

    enum CodingKeys: String, CodingKey {
        case error
        case requestId = "request_id"
    }
}

struct APIErrorDetail: Decodable {
    let code: String
    let message: String
}

enum ForecastAPIError: Error, Equatable, LocalizedError {
    case invalidURL
    case invalidResponse
    case httpStatus(Int)
    case server(statusCode: Int, code: String, message: String)
    case decoding(String)

    var errorDescription: String? {
        switch self {
        case .invalidURL: "The forecast URL is invalid."
        case .invalidResponse: "The server returned an unreadable response."
        case .httpStatus(let status): "Forecast request failed with status \(status)."
        case .server(_, _, let message): message
        case .decoding: "The forecast response did not match the app contract."
        }
    }
}
