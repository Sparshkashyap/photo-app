import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Counter } from "k6/metrics";

const BASE_URL =
  __ENV.BASE_URL ||
  "https://y181ertste.execute-api.ap-south-1.amazonaws.com";

const EMAIL = __ENV.TEST_EMAIL;
const PASSWORD = __ENV.TEST_PASSWORD;

// Custom metrics
const folderErrors = new Rate("folder_errors");
const serverErrors = new Counter("server_errors");

export const options = {
  stages: [
    // Warm-up
    { duration: "1m", target: 100 },

    // 100 users
    { duration: "5m", target: 100 },

    // 200 users
    { duration: "1m", target: 200 },
    { duration: "5m", target: 200 },

    // 500 users
    { duration: "1m", target: 500 },
    { duration: "5m", target: 500 },

    // 750 users
    { duration: "1m", target: 750 },
    { duration: "5m", target: 750 },

    // 1000 users
    { duration: "1m", target: 1000 },
    { duration: "5m", target: 1000 },

    // Cool down
    { duration: "1m", target: 0 },
  ],

  thresholds: {
    // Less than 5% failed HTTP requests
    http_req_failed: ["rate<0.05"],

    // 95% of requests should finish below 2 seconds
    http_req_duration: ["p(95)<2000"],

    // At least 95% checks successful
    checks: ["rate>0.95"],

    // Folder endpoint errors below 5%
    folder_errors: ["rate<0.05"],
  },

  // Don't stop the whole test because of a temporary error
  gracefulRampDown: "30s",
};

export function setup() {
  if (!EMAIL || !PASSWORD) {
    throw new Error(
      "TEST_EMAIL and TEST_PASSWORD environment variables are required"
    );
  }

  console.log(`Testing API: ${BASE_URL}`);
  console.log("Logging in test user...");

  const loginResponse = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({
      email: EMAIL,
      password: PASSWORD,
    }),
    {
      headers: {
        "Content-Type": "application/json",
      },
      tags: {
        endpoint: "login",
      },
    }
  );

  const loginSuccess = check(loginResponse, {
    "login status is 200": (r) => r.status === 200,

    "login returned token": (r) => {
      try {
        return !!JSON.parse(r.body).token;
      } catch {
        return false;
      }
    },
  });

  if (!loginSuccess) {
    throw new Error(
      `Login failed. Status: ${loginResponse.status}, Body: ${loginResponse.body}`
    );
  }

  const token = JSON.parse(loginResponse.body).token;

  console.log("Login successful.");

  return {
    token,
  };
}

export default function (data) {
  const response = http.get(`${BASE_URL}/folders`, {
    headers: {
      Authorization: `Bearer ${data.token}`,
    },

    tags: {
      endpoint: "folders",
    },

    timeout: "30s",
  });

  const isSuccess = check(response, {
    "folders status is 200": (r) => r.status === 200,

    "folders response is JSON": (r) =>
      r.headers["Content-Type"]?.includes("application/json"),

    "folders response received": (r) => r.body !== undefined,
  });

  // Custom error tracking
  folderErrors.add(!isSuccess);

  // Track HTTP 5xx errors separately
  if (response.status >= 500) {
    serverErrors.add(1);
  }

  /*
   * Keep this sleep if you want realistic user behavior.
   *
   * Remove/comment it if you want maximum backend throughput.
   */
  sleep(1);
}