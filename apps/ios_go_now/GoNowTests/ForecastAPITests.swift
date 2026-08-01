import Foundation
import XCTest
@testable import GoNow

final class ForecastAPITests: XCTestCase {
    func testClientBuildsScoresRequestAndDecodesResponse() async throws {
        let session = StubSession(data: TestFixtures.forecastJSON, statusCode: 200)
        let client = URLSessionForecastClient(
            baseURL: URL(string: "https://example.test")!,
            areaID: "tel_aviv_coast",
            session: session,
            decoder: .goNowAPI
        )

        let forecast = try await client.fetchScores(days: 7)

        XCTAssertEqual(forecast.hours.count, 6)
        XCTAssertEqual(session.lastRequest?.url?.path, "/v1/public/scores")
        XCTAssertEqual(session.lastRequest?.url?.query?.contains("area_id=tel_aviv_coast"), true)
        XCTAssertEqual(session.lastRequest?.url?.query?.contains("days=7"), true)
    }

    func testClientMapsAPIErrorEnvelope() async {
        let body = """
        {"error":{"code":"NOT_FOUND","message":"No forecast data","details":{}},"request_id":"abc"}
        """.data(using: .utf8)!
        let client = URLSessionForecastClient(
            baseURL: URL(string: "https://example.test")!,
            areaID: "tel_aviv_coast",
            session: StubSession(data: body, statusCode: 404),
            decoder: .goNowAPI
        )

        do {
            _ = try await client.fetchScores(days: 7)
            XCTFail("Expected API error")
        } catch let error as ForecastAPIError {
            XCTAssertEqual(error, .server(statusCode: 404, code: "NOT_FOUND", message: "No forecast data"))
        } catch {
            XCTFail("Unexpected error: \(error)")
        }
    }

    func testClientBuildsHealthRequestAndDecodesResponse() async throws {
        let session = StubSession(data: TestFixtures.healthJSON, statusCode: 200)
        let client = URLSessionForecastClient(
            baseURL: URL(string: "https://example.test")!,
            areaID: "tel_aviv_coast",
            session: session,
            decoder: .goNowAPI
        )

        let health = try await client.fetchHealth()

        XCTAssertEqual(health.status, .healthy)
        XCTAssertEqual(session.lastRequest?.url?.path, "/v1/public/health")
        XCTAssertNil(session.lastRequest?.url?.query)
    }
}

final class StubSession: HTTPSession, @unchecked Sendable {
    let data: Data
    let statusCode: Int
    private(set) var lastRequest: URLRequest?

    init(data: Data, statusCode: Int) {
        self.data = data
        self.statusCode = statusCode
    }

    func data(for request: URLRequest) async throws -> (Data, URLResponse) {
        lastRequest = request
        let response = HTTPURLResponse(
            url: request.url!,
            statusCode: statusCode,
            httpVersion: nil,
            headerFields: nil
        )!
        return (data, response)
    }
}
