const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const {
  isValidEmail,
  isValidPassword,
  isValidName,
} = require("../utils/validation");

const {
  putItem,
  findUserByEmail,
} = require("./dynamoService");

const {
  generateToken,
} = require("../utils/jwt");

const USERS_TABLE = process.env.USERS_TABLE_NAME;

const registerUser = async ({ name, email, password }) => {
  if (!isValidName(name)) {
    throw new Error("Name must contain at least 2 characters");
  }

  if (!isValidEmail(email)) {
    throw new Error("Invalid email format");
  }

  if (!isValidPassword(password)) {
    throw new Error("Password must contain at least 8 characters");
  }

  const normalizedEmail = email.trim().toLowerCase();

  const existingUser = await findUserByEmail(
    USERS_TABLE,
    normalizedEmail
  );

  if (existingUser) {
    const error = new Error(
      "An account with this email already exists"
    );
    error.statusCode = 409;
    throw error;
  }

  const userId = crypto.randomUUID();

  const passwordHash = await bcrypt.hash(password, 12);

  const user = {
    userId,
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    createdAt: new Date().toISOString(),
  };

  await putItem(USERS_TABLE, user);

  const token = generateToken({
    userId,
  });

  return {
    token,
    user: {
      userId,
      name: user.name,
      email: user.email,
    },
  };
};

const loginUser = async ({ email, password }) => {
  if (!isValidEmail(email)) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  const normalizedEmail = email.trim().toLowerCase();

  const user = await findUserByEmail(
    USERS_TABLE,
    normalizedEmail
  );

  if (!user) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  const passwordMatches = await bcrypt.compare(
    password,
    user.passwordHash
  );

  if (!passwordMatches) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  const token = generateToken({
    userId: user.userId,
  });

  return {
    token,
    user: {
      userId: user.userId,
      name: user.name,
      email: user.email,
    },
  };
};

module.exports = {
  registerUser,
  loginUser,
};