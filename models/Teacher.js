const mongoose = require("mongoose");

const teacherSchema = new mongoose.Schema({
	username: { type: String, required: true, unique: true },
	password: { type: String, required: true },
	name: { type: String, required: true },
	gender: { type: String, enum: ["male", "female"], required: true },
	dob: { type: Date, required: true },
	schedule: {
		type: {
			Saturday: { type: [String] },
			Sunday: { type: [String] },
			Monday: { type: [String] },
			Tuesday: { type: [String] },
			Wednesday: { type: [String] },
			Thursday: { type: [String] },
			Friday: { type: [String] },
		},
		default: null,
	},
});

module.exports = mongoose.model("Teacher", teacherSchema);
