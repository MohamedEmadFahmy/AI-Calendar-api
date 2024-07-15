const express = require("express");
const bodyParser = require("body-parser");
const Groq = require("groq-sdk");
const cors = require("cors");
const mongoose = require("mongoose");
const Teacher = require("./models/Teacher");
require("dotenv").config();

const app = express();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const corsOptions = {
	origin: true, // Allow requests from this origin
	methods: ["GET", "POST"], // Allow only GET and POST requests
	allowedHeaders: ["Content-Type", "Authorization"], // Allow only specific headers
};

app.use(cors(corsOptions));

mongoose.connect(process.env.mongo_url);

const db = mongoose.connection;

db.on("error", console.error.bind(console, "MongoDB connection error:"));
db.once("open", () => {
	console.log("Connected to MongoDB");
});

async function parseAvailability(inputText) {
	// prompt to say so the llm understands the purpose of the input
	const prompt = `
		Please convert the following natural language description of availability into a structured JSON format, including days of the week and their corresponding time slots.
		
		Ensure the following guidelines:
		1) NOTE THAT THE WEEKENDS IN EGYPT ARE FRIDAY AND SATURDAY AND WEEKDAYS ARE from SUNDAY TO THURSDAY.
		2) Interpret "noon" as 12:00 and "midnight" as 00:00.
		3) If no time slot is specified for a day, have 2 nulls.
		4) DO NOT SAY ANYTHING MORE THAN THE JSON OBJECT. DO NOT INCLUDE ANY ADDITIONAL TEXT OR COMMENTS.
		5) order the json object starting from saturday.
		6) If i say morning its around 8-10 am and night is around 6-8 pm.
		7) if i say all day then make it from 00:00 to 23:59.
		8) IF I SPECIFY ONLY ONE as pm or am assume the other one is the same.
		9) SUNDAY IS NOT A WEEKEND ITS A WEEKDAY


		Example:
			Input: "I am available between noon and 4pm on weekends, after 7 pm to midnight on Monday and Wednesday, and after 9pm otherwise."

			Output:
			{
				"Saturday": ["12:00", "16:00"],
				"Sunday": ["21:00", "00:00"]
				"Monday": ["19:00", "00:00"],
				"Tuesday": ["21:00", "00:00"],
				"Wednesday": ["19:00", "00:00"],
				"Thursday": ["21:00", "00:00"],
				"Friday": ["12:00", "16:00"],
			}
		
		now provide the output for this input following the same format not data:
		input : 

	`;

	const message = `${prompt}${inputText}`;

	const chatCompletion = await groq.chat.completions.create({
		messages: [
			{
				role: "user",
				content: message,
			},
		],
		model: "whisper-large-v3",
	});

	const parsedAvailability =
		chatCompletion.choices[0]?.message?.content || "";
	console.log(chatCompletion.choices[0]?.message?.content);
	return JSON.parse(parsedAvailability);
}

// schedule maker endpoint
app.post("/parse_availability", async (req, res) => {
	const inputText = req.body.message;

	console.log("Message is ", inputText);

	try {
		const parsedResult = await parseAvailability(inputText);
		res.json(parsedResult);
	} catch (error) {
		res.status(500).json({ error: "Error parsing availability" });
	}
});

app.post("/login", async (req, res) => {
	// console.log(req);

	const { username, password } = req.body;

	console.log("Username:", username);
	console.log("Password:", password);

	try {
		let user = await Teacher.findOne({ username, password });

		if (!user) {
			res.json({ exists: false, schedule: null });
			return;
		}

		let schedule = {};
		for (let day in user.schedule) {
			if (
				day === "Saturday" ||
				day === "Sunday" ||
				day === "Monday" ||
				day === "Tuesday" ||
				day === "Wednesday" ||
				day === "Thursday" ||
				day === "Friday"
			) {
				schedule[day] = user.schedule[day];
			}
		}

		console.log("Schedule:", schedule);

		res.json({ exists: true, schedule: schedule });

		console.log("User exists:", true);
		console.log(user);
	} catch (error) {
		console.error("Error checking user existence:", error);
		res.status(500).json({ error: "Server error" });
	}
});

app.post("/update_schedule", async (req, res) => {
	// console.log(req);

	try {
		console.log(req.body);
		const { username, password, schedule } = req.body;

		updateScheduleOnDatabase(username, password, schedule);

		res.json({ message: "Schedule updated" });
	} catch (error) {
		console.error("Error updating user schedule:", error);
		res.status(500).json({ error: "Server error" });
	}
});

const updateScheduleOnDatabase = async (username, password, schedule) => {
	try {
		const updatedTeacher = await Teacher.findOneAndUpdate(
			{ username: username, password: password },
			{ $set: { schedule: schedule } },
			{ new: true }
		);

		if (updatedTeacher) {
			console.log("Teacher schedule updated:", updatedTeacher);
		} else {
			console.log("Teacher not found");
		}
	} catch (err) {
		console.error("Error updating teacher schedule:", err);
	}
};

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
});

const fetchAllTeachers = async () => {
	const teachers = await Teacher.find({});
	console.log(teachers);
};
fetchAllTeachers();
