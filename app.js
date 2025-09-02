const express = require("express");
const cookieParser = require("cookie-parser");
const mongoSanitize = require("express-mongo-sanitize");
const xssMiddleware = require("./middlewares/xssMiddleware");
const morgan = require("morgan");
const cors = require("cors");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const dotenv = require("dotenv");
const errorHandler = require("./middlewares/errorHandler");

const app = express();

app.use(express.json({ limit: "500mb" })); // <- Parses Json data
app.use(express.urlencoded({ extended: true, limit: "500mb" })); // <- Parses URLencoded data

dotenv.config({ path: "./.env" }); // <- connecting the enviroment variables
// MIDLEWARES ->>
app.set("trust proxy", 1);

const CLIENT_URL = process.env.CLIENT_URL;
const ADMIN_URL = process.env.ADMIN_URL;
const allowedOrigins = [CLIENT_URL, ADMIN_URL];
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            const error = new Error("Not allowed by CORS");
            console.log(error);
            console.log(origin);
            callback(error);
        }
    },
    credentials: true,
};

app.use(cors(corsOptions));
app.use(cookieParser());

console.log(`ENV = ${process.env.NODE_ENV}`);
app.use(morgan("dev")); // <- Logs res status code and time taken

// Limits #apicalls that can be made per IP address
const limiter = rateLimit({
    max: 1000, // max number of times per windowMS
    windowMs: 60 * 60 * 1000, //1hr
    message: "Too many requests, Please try again in 1 hour !!!",
});

app.use("/api/v1", limiter);

app.use((req, res, next) => {
    // <- Serves req time and cookies

    req.requestTime = new Date().toISOString();
    console.log(req.requestTime);
    if (req.cookies) console.log(req.cookies);
    next();
});

app.use((req, res, next) => {
    res.setHeader("Content-Type", "application/json");
    next();
});

// Data Sanitization aganist NoSQL query Injection.
app.use(mongoSanitize());

// Data Sanitization aganist XSS (Cross Site Scripting) attacks
app.use(xssMiddleware);

// compressing the size of HTTP response data before sending
app.use(compression());

// Routers for app
// const router = require("./routes/mainroutes");
// const authRouter = require("./routes/authRoutes");
// const userRouter = require("./routes/userRoutes");
// const eventRouter = require("./routes/eventRoutes");
// const userEnrollRouter = require("./routes/userEnrollRoutes");

// setting Routes
// app.use("/api/v1/", router);
// app.use("/api/v1/auth/", authRouter);
// app.use("/api/v1/member/", userRouter);
// app.use("/api/v1/event/", eventRouter);
// app.use("/api/v1/eventreg/", userEnrollRouter);

// app.all('*', (req, res, next) => {	// <- Middleware to handle Non-existing Routes
// 	return res.statusCode(404).json({
//         success: 'false',
//         status: 404,
//         message: 'Route not found in server',
//     })
// });

app.use(errorHandler); // <- Error Handling Middleware

module.exports = app;
