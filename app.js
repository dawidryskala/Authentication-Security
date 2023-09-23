//jshint esversion:6
import 'dotenv/config';
import express from "express";
import bodyParser from "body-parser";
import path from "path";
import { basename, dirname } from "path";
import { fileURLToPath } from "url";
import ejs from "ejs";
import mongoose from "mongoose";
import encrypt from "mongoose-encryption";


const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(bodyParser.urlencoded({ extended: true }));

mongoose.connect("mongodb://127.0.0.1:27017/userDB");


const userSchema = new mongoose.Schema({
    email: String,
    password: String,
});

userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ["password"] });


const User = mongoose.model("User", userSchema);

app.get("/", function (req, res) {
    res.render("home");
});

app.get("/login", function (req, res) {
    res.render("login");
});

app.get("/register", function (req, res) {
    res.render("register");
});

app.post("/register", function (req, res) {
    const newUser = new User({
        email: req.body.username,
        password: req.body.password,
    })

    newUser.save().then(function () {
        res.render("secrets")
    }).catch(function (err) {
        console.log(err);
    });
});

app.post("/login", function (req, res) {
    const username = req.body.username;
    const password = req.body.password;

    User.findOne({ email: username, }).then(function (foundUser) {

        if (foundUser) {
            console.log("Usere was found")
            if (foundUser.password === password) {
                res.render("secrets");
            }
        } else if (!foundUser) {
            res.render("login");
        }
    }).catch(function (err) {
        console.log(err);
    });
});


app.listen(3000, function () {
    console.log("Server started on port 3000.");
});

