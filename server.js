const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const session = require("express-session");

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/static", express.static("public"));

app.use(session({
  secret: "eventsecret",
  resave: false,
  saveUninitialized: true
}));

mongoose.connect("mongodb://127.0.0.1:27017/eventsDB")
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));
mongoose.connection.once("open", () => {
  console.log("Connected to DB:", mongoose.connection.name);
});


const userSchema = new mongoose.Schema({
  username: String,
  password: String
});
const User = mongoose.model("User", userSchema);

const eventSchema = new mongoose.Schema({
  title: String,
  date: String,
  venue: String,
  user: String,
  approved: { type: Boolean, default: false }
});
const Event = mongoose.model("Event", eventSchema);

app.get("/", (req, res) => {
  if (!req.session.user) {
    res.sendFile(__dirname + "/public/login.html");
  } else {
    res.sendFile(__dirname + "/public/index.html");
  }
});

app.post("/register", async (req, res) => {
  await new User(req.body).save();
  res.redirect("/");
});

app.post("/login", async (req, res) => {
  const user = await User.findOne(req.body);
  if (!user) return res.send("Login failed");

  req.session.user = user.username;
  req.session.role = (user.username === "admin") ? "admin" : "user";
  res.redirect("/");
});

app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/");
});

app.post("/add-event", async (req, res) => {
  if (!req.session.user) return res.redirect("/");

 const event = new Event({
  title: req.body.title,
  date: req.body.date,
  venue: req.body.venue,
  user: req.session.user
});
await event.save();
console.log("Saved:", event);


  res.redirect("/events");
});

app.get("/events", async (req, res) => {
  if (!req.session.user) return res.redirect("/");

  const events = await Event.find({ approved: true });

  let page = `
  <html>
  <head>
    <title>Events</title>
    <link rel="stylesheet" href="/static/style.css">
  </head>
  <body>
    <div class="container">
      <h1>📅 Live Events</h1>
  `;

  events.forEach(e => {
    page += `
      <div class="card">
        <h3>${e.title}</h3>
        <p>${e.date}</p>
        <p>${e.venue}</p>
        <p>By ${e.user}</p>
      </div>
    `;
  });

  page += `
      <a href="/">Back</a>
      <a href="/logout">Logout</a>
    </div>
  </body>
  </html>
  `;

  res.send(page);
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});

app.get("/admin", async (req, res) => {
  if (req.session.role !== "admin") return res.send("Access Denied");

  const events = await Event.find({ approved: false });

  let page = `
  <html>
  <head>
    <title>Admin</title>
    <link rel="stylesheet" href="/static/style.css">
  </head>
  <body>
    <div class="container">
      <h1>Admin Panel</h1>
  `;

  events.forEach(e => {
    page += `
      <div class="card">
        <h3>${e.title}</h3>
        <p>${e.date}</p>
        <p>${e.venue}</p>
        <a href="/approve/${e._id}">Approve</a>
      </div>
    `;
  });

  page += `
      <a href="/">Back</a>
      <a href="/logout">Logout</a>
    </div>
  </body>
  </html>
  `;

  res.send(page);
});

app.get("/approve/:id", async (req, res) => {
  await Event.findByIdAndUpdate(req.params.id, { approved: true });
  res.redirect("/admin");
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});

