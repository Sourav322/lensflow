import authRoutes from "./routes/auth"
import customers from "./routes/customers"
import frames from "./routes/frames"
import lenses from "./routes/lenses"
import accessories from "./routes/accessories"
import orders from "./routes/orders"
import labOrders from "./routes/labOrders"
import repairs from "./routes/repairs"
import prescriptions from "./routes/prescriptions"
import staff from "./routes/staff"
import invoices from "./routes/invoices"
import reports from "./routes/reports"

app.use("/auth", authRoutes)
app.use("/customers", customers)
app.use("/frames", frames)
app.use("/lenses", lenses)
app.use("/accessories", accessories)
app.use("/orders", orders)
app.use("/lab-orders", labOrders)
app.use("/repairs", repairs)
app.use("/prescriptions", prescriptions)
app.use("/staff", staff)
app.use("/invoices", invoices)
app.use("/reports", reports)
