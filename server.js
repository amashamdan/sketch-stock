var express = require("express");
var mongodb = require("mongodb");
var app = express();
/* Creating a server for web sockets. */
var server = require('http').createServer(app);
var io = require("socket.io")(server);
var ejs = require("ejs");
app.use("/stylesheets", express.static(__dirname + "/views/stylesheets"));
app.use("/scripts", express.static(__dirname + "/views/scripts"));
var MongoClient = mongodb.MongoClient;
var mongoUrl = process.env.STOCKS;
MongoClient.connect(mongoUrl, function(err, db) {
	if (err) {
		res.end("Failed to connect to database.")
	} else {
		var companies = db.collection("companies");
		/* When a socket connects to the server. */
		io.on("connection", function(client) {
			/* getStock function is called to send data to the socket. */
			getStock(companies, client, "firstLoad");
			/* newCompany event. emitted by clients when a new company is added. */
			client.on("newCompany", function(company) {
				/* The added company on the client is added to the database. */
				companies.update(
					{},
					/* addToSet avoids duplication (duplications is prevented on the client as well). */
					{"$addToSet": {"symbols": company}},
					function() {
						/* getStock is called with companyAdded status */
						getStock(companies, client, "companyAdded");
					}
				);
			});
			/* delete event handler. */
			client.on("delete", function(company) {
				/* The selected company is removed from the database. */
				companies.update(
					{},
					{"$pull": {"symbols": company}},
					function() {
						/* getStock is called with 'companyRemoved' status. */
						getStock(companies, client, "companyRemoved");
					}
				)
			});
		});
		/* get request on root. Renders index.ejs. */
		app.get("/", function(req, res) {
			res.render("index.ejs");
		});
	}
});
/* This function loads a list of the companies' code from the database and sends it to the clients or clients. */
function getStock(companies, client, status) {
	/* This array will hold the list of companies. */
	var symbols = [];
	/* List of companies is retrieved from the data base. */
	companies.find({}).toArray(function(err, result) {
		/* The companies' list is saved in symbols. */
		symbols = result[0].symbols;
		/* Depending on status parameter, a single client, all other clients or both are sent the list of codes. If a company is added, only other clients are sent the list. The client initiating the addition will handle adding the new company data on its own. */
		if (status == "companyAdded") {
			client.broadcast.emit("results", symbols);
		/* This state when a client loads (or reloads the page). Only that client receives this event. */
		} else if (status == "firstLoad") {
			client.emit("results", symbols);
		/* Upon deletion, all clients receive the new list. */
		} else if (status == "companyRemoved") {
			client.broadcast.emit("results", symbols);
			client.emit("results", symbols);
		}
	});
}

var port = Number(process.env.PORT || 8080);
/* NOTICE server.listen NOT app.listen */
server.listen(port);