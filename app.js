const express = require("express");
const { MongoClient } = require("mongodb");
const path = require("path");

const app = express();
const PORT = 5000;
const MONGO_URL = "mongodb://127.0.0.1:27017";

app.use(express.urlencoded({ extended: false }));

const client = new MongoClient(MONGO_URL);
let usersCollection;

// Escape user input before placing it into HTML, to prevent HTML injection.
function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
  })[character]);
}

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "home.html"));
});

app.post("/server", async (req, res) => {
  try {
    const { name, password, age, mobile, email, gender, state, skills } = req.body;
    if (![name, password, age, mobile, email, gender, state, skills].every(value =>
      typeof value === "string" && value.trim() !== ""
    )) {
      return res.status(400).send("Error: all fields are mandatory. Go back and complete the form.");
    }
    if (password.length < 8) {
      return res.status(400).send("Password must contain at least 8 characters.");
    }
    if (!/^[0-9]{10}$/.test(mobile)) {
      return res.status(400).send("Mobile number must contain exactly 10 digits.");
    }
    if (!Number.isInteger(Number(age)) || Number(age) < 1 || Number(age) > 120) {
      return res.status(400).send("Enter a valid age between 1 and 120.");
    }

    // Demo-lab note: password is intentionally NOT stored in this exercise.
    await usersCollection.insertOne({
      name: name.trim(),
      age: Number(age),
      mobile: mobile.trim(),
      email: email.trim(),
      gender: gender.trim(),
      state: state.trim(),
      skills: skills.trim(),
      createdAt: new Date()
    });

    return res.redirect("/server");
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).send("Unable to save registration details. Check MongoDB and try again.");
  }
});

app.get("/users", (req, res) => res.redirect("/server"));

app.get("/server", async (req, res) => {
  try {
    const users = await usersCollection.find({})
      .project({ _id: 0, name: 1, age: 1, mobile: 1, email: 1, gender: 1, state: 1, skills: 1 })
      .sort({ createdAt: -1 })
      .toArray();

    const rows = users.map(user => `
      <tr>
        <td>${escapeHTML(user.name)}</td><td>${escapeHTML(user.age)}</td>
        <td>${escapeHTML(user.mobile)}</td><td>${escapeHTML(user.email)}</td>
        <td>${escapeHTML(user.gender)}</td><td>${escapeHTML(user.state)}</td>
        <td>${escapeHTML(user.skills)}</td>
      </tr>`).join("");

    res.send(`<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Registered Users</title>
<style>
body{font-family:Arial,sans-serif;margin:0;padding:28px;background:#eef4f0;color:#24332b}
main{max-width:1100px;margin:auto;background:white;padding:24px;border-radius:12px;box-shadow:0 8px 24px #173d2514}
h1{color:#176b45} .table-wrap{overflow-x:auto}
table{width:100%;border-collapse:collapse;margin-top:18px}
th,td{border:1px solid #d3ded6;padding:11px;text-align:left}
th{background:#187648;color:white} tr:nth-child(even){background:#f5f8f6}
a{color:#176b45}
</style></head><body><main>
<h1>Registered Users</h1>
<p><a href="/">← Register another user</a></p>
<div class="table-wrap"><table><thead><tr>
<th>Name</th><th>Age</th><th>Mobile</th><th>Email</th><th>Gender</th><th>State</th><th>Skills</th>
</tr></thead><tbody>${rows || '<tr><td colspan="7">No registrations yet.</td></tr>'}</tbody></table></div>
</main></body></html>`);
  } catch (error) {
    console.error("Retrieval error:", error);
    res.status(500).send("Unable to retrieve user details. Check MongoDB and try again.");
  }
});

async function startServer() {
  try {
    await client.connect();
    const database = client.db("SaipriyaRegistrationDB");
    usersCollection = database.collection("students");

    // Add clearly fictional demo rows only when the collection is empty,
    // so the results page has example names for a first-time lab demo.
    const existingCount = await usersCollection.countDocuments();
    if (existingCount === 0) {
      await usersCollection.insertMany([
        { name: "Arun Kumar (Demo)", age: 20, mobile: "9000000001", email: "arun.demo@example.com", gender: "Male", state: "Tamil Nadu", skills: "HTML, CSS", createdAt: new Date() },
        { name: "Priya Sharma (Demo)", age: 19, mobile: "9000000002", email: "priya.demo@example.com", gender: "Female", state: "Kerala", skills: "JavaScript, Node.js", createdAt: new Date() },
        { name: "Kavin Raj (Demo)", age: 21, mobile: "9000000003", email: "kavin.demo@example.com", gender: "Male", state: "Karnataka", skills: "MongoDB, Express", createdAt: new Date() }
      ]);
    }

    app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
      console.log("MongoDB connected: SaipriyaRegistrationDB.students");
    });
  } catch (error) {
    console.error("Could not connect to MongoDB. Make sure MongoDB is running.", error);
    process.exit(1);
  }
}

startServer();

async function shutDown() {
  await client.close();
  process.exit(0);
}
process.on("SIGINT", shutDown);
process.on("SIGTERM", shutDown);
