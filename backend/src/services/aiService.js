const axios = require("axios");
const FormData = require("form-data");

const AI_SERVICE_URL =
  process.env.AI_SERVICE_URL ||
  "https://photo-app-ai-service.tech.blitz.cloud";

const MAX_ATTEMPTS = 2;
const REQUEST_TIMEOUT = 80000;

const sleep = (ms) =>
  new Promise((resolve) =>
    setTimeout(resolve, ms),
  );

const isRetryableError = (error) => {
  const status =
    error?.response?.status;

  if (!status) {
    return true;
  }

  return (
    status === 408 ||
    status === 429 ||
    status >= 500
  );
};

const generateImageCaption = async ({
  imageBuffer,
  fileName,
  contentType,
}) => {
  if (!imageBuffer) {
    throw new Error(
      "Image buffer is required",
    );
  }

  let lastError;

  for (
    let attempt = 1;
    attempt <= MAX_ATTEMPTS;
    attempt += 1
  ) {
    const formData = new FormData();

    formData.append(
      "file",
      imageBuffer,
      {
        filename:
          fileName || "image.jpg",

        contentType:
          contentType || "image/jpeg",
      },
    );

    try {
      console.log(
        `AI caption attempt ${attempt}/${MAX_ATTEMPTS}`,
      );

      const response =
        await axios.post(
          `${AI_SERVICE_URL}/caption`,
          formData,
          {
            headers:
              formData.getHeaders(),

            maxContentLength:
              Infinity,

            maxBodyLength:
              Infinity,

            timeout:
              REQUEST_TIMEOUT,

            validateStatus:
              () => true,
          },
        );

      if (
        response.status >= 200 &&
        response.status < 300
      ) {
        return response.data;
      }

      const error =
        new Error(
          response.data?.detail ||
            response.data?.message ||
            `AI service returned HTTP ${response.status}`,
        );

        error.response = response;

        throw error;
    } catch (error) {
      lastError = error;

      console.error(
        `AI service attempt ${attempt} failed:`,
        error.response?.data ||
          error.message,
      );

      if (
        attempt >= MAX_ATTEMPTS ||
        !isRetryableError(error)
      ) {
        break;
      }

      await sleep(1500);
    }
  }

  throw new Error(
    lastError?.response?.data?.detail ||
      lastError?.message ||
      "AI caption generation failed",
  );
};

const checkAIServiceHealth =
  async () => {
    try {
      const response =
        await axios.get(
          `${AI_SERVICE_URL}/health`,
          {
            timeout: 10000,
          },
        );

      return response.data;
    } catch (error) {
      console.error(
        "AI service health check failed:",
        error.message,
      );

      return {
        success: false,
        status: "unavailable",
      };
    }
  };

module.exports = {
  generateImageCaption,
  checkAIServiceHealth,
};