const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDatabase = require("./config/database");
const app = express();

const PORT = 4000;

// middlewares 
app.use(express.json());
app.use(cors());
dotenv.config();
connectDatabase();

// routes define here 
const authRouter = require("./routes/authRoutes");
const onboardingRouter = require("./routes/onboardingRoutes")
const dashboardRouter = require("./routes/dashboardRoutes");
const jobRouter = require("./routes/jobRoutes");
const discountRouter = require("./routes/discountRoutes");
const reworkRouter = require("./routes/reworkRoutes")
const reportRouter = require("./routes/reportRoutes");
const insightsRouter = require("./routes/insightsRoutes");
const profileRouter = require("./routes/profileRoutes");
const alertsRouter = require("./routes/alertsRoutes");
const teamRouter = require("./routes/teamRoutes");
const notificationRouter = require("./routes/notificationRoutes");


// admin routes ====
const adminRouter = require("./routes/adminAuthRoutes");
const adminUserRouter = require("./routes/adminUsersRoutes");
const adminBusinessRouter = require("./routes/adminBusinessRoutes");
const adminRevenueAnalyticsRouter = require("./routes/adminRevenueAnalyticsRoutes");



app.use("/api/auth", authRouter);
app.use("/api/onboarding", onboardingRouter)
app.use("/api/dashboard", dashboardRouter);
app.use("/api/jobs", jobRouter);
app.use("/api/discounts", discountRouter);
app.use("/api/rework", reworkRouter);
app.use("/api/reports", reportRouter);
app.use("/api/insights", insightsRouter);
app.use("/api/profile", profileRouter);
app.use("/api/alerts", alertsRouter);
app.use("/api/team", teamRouter);
app.use("/api/notifications", notificationRouter);



// admin routes 
app.use("/api/admin", adminRouter);
app.use("/api/admin/users", adminUserRouter);
app.use("/api/admin/businesses", adminBusinessRouter);
app.use("/api/admin", adminRevenueAnalyticsRouter);

app.get("/", (req, res) => {
    res.send("Helllo world")
});


// listen on port 
app.listen(PORT, () => {
    console.log(`Server is running on port: ${PORT}`)
})