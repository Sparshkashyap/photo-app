const axios = require("axios");
const FormData = require("form-data");

const AI_SERVICE_URL =
  process.env.AI_SERVICE_URL ||
  "http://127.0.0.1:8000";

const generateImageCaption = async ({
  imageBuffer,
  fileName,
  contentType,
}) => {
  if (!imageBuffer) {
    throw new Error("Image buffer is required");
  }

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
            120000,
        },
      );

    return response.data;
  } catch (error) {
    console.error(
      "AI service error:",
      error.response?.data ||
        error.message,
    );

    throw new Error(
      "AI caption generation failed",
    );
  }
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