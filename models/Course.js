// import mongoose from 'mongoose';

// const courseSchema = new mongoose.Schema({
//   name: {
//     type: String,
//     required: true
//   },
//   code: {
//     type: String,
//     required: true,
//     unique: true
//   },
//   description: String,
//   credits: {
//     type: Number,
//     required: true
//   },
//   department: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'Department',
//     required: true
//   },
//   teacher: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: true
//   },
//   students: [{
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User'
//   }],
//   schedule: {
//     day: String,
//     time: String,
//     room: String
//   },
//   createdAt: {
//     type: Date,
//     default: Date.now
//   }
// });

// const Course = mongoose.model('Course', courseSchema);
// export default Course;
