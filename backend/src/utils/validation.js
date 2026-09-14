const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const isValidPassword = (password) => {
  return typeof password === "string" && password.length >= 8;
};

const isValidName = (name) => {
  return typeof name === "string" && name.trim().length >= 2;
};

const sanitizeFileName = (fileName) => {
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_");
};

const allowedImageTypes = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

module.exports = {
  isValidEmail,
  isValidPassword,
  isValidName,
  sanitizeFileName,
  allowedImageTypes,
};