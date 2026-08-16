import request from "supertest";

const BASE_URL = "http://localhost:3000";

describe("Eventful API smoke tests", () => {
  it("GET / returns alive message", async () => {
    const res = await request(BASE_URL).get("/");
    expect(res.status).toBe(200);
    expect(res.text).toContain("alive");
  });

  it("GET /events returns an array", async () => {
    const res = await request(BASE_URL).get("/events");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("GET /users without a token returns 401", async () => {
    const res = await request(BASE_URL).get("/users");
    expect(res.status).toBe(401);
  });

  it("POST /events without auth is rejected", async () => {
    const res = await request(BASE_URL).post("/events").send({});
    expect(res.status).toBe(401);
  });
});