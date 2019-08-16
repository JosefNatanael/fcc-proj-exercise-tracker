const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const cors = require('cors')
const mongoose = require('mongoose')
mongoose.connect(process.env.MLAB_URI)

app.use(cors())
app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const userSchema = mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  }
});

const exerciseSchema = mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  description: String,
  duration: Number,
  date: String
})

const User = mongoose.model("User", userSchema);

const ExerciseData = mongoose.model("ExerciseData", exerciseSchema);

app.post("/api/exercise/new-user", (req, res) => {
    if (req.body.username.length > 20) {
      return res.send("username too long")
    }
  User.find({username: req.body.username}, (err, data) => {
    if (data.length != 0) 
    {
      return res.send("username already taken");
    } 
    else 
    {
      const newUser = new User({username: req.body.username});
      newUser.save((err, savedUser) => {
        if (err) return res.send("Error creating new user in the database");
        const tempUsername = savedUser["username"];
        const tempId = savedUser["_id"];
        res.json({username: tempUsername, "_id": tempId});
      });
    }
  }).limit(1);
});

app.get("/api/exercise/users", (req, res) => {
  User.find({}, (err, data) => {
    res.send(data);
  })
});

app.post("/api/exercise/add", (req, res) => {
  User.findById(req.body.userId).exec((err, data) => {
    if (err) return res.send("unknown _id");
    const currentUser = data.username;
    ExerciseData.find({userId: req.body.userId}).exec((err, data) => {
      if (err) return res.send("An error occurred when trying to match past exercises");
      if (req.body.description == "") return res.send("Path `description` is required.");
      if (req.body.duration == "") return res.send("Path `duration` is required.");

      let d;
      if (req.body.date != "") {
        d = new Date(req.body.date);
      }
      else {
        d = new Date();
      }
      const currentTimeFormatted = d.toUTCString().slice(0, 3) + " " + d.toUTCString().slice(8, 12) + d.toUTCString().slice(5, 8) + d.toUTCString().slice(12, 16);
      const currentOutput = {
        "username": currentUser,
        "description": req.body.description,
        "duration": req.body.duration,
        "_id": req.body.userId,
        "date": currentTimeFormatted,
      };
      const newExercise = new ExerciseData({
        userId: req.body.userId, description: req.body.description, duration: req.body.duration, date:currentTimeFormatted
      });
      newExercise.save(err => {
        if (err) return res.send("Error saving new exercise data");
      });
      res.json(currentOutput);

    });
  });
});

app.get("/api/exercise/log", (req, res) => {
  if (req.query.length == 0) {
    return res.send("unknown userId");
  } else if (!Object.keys(req.query).includes("userId")) {
    return res.send("unknown userId")
  } else if (req.query.userId == "") {
    return res.send("unknown userId")
  }
  // Check if there userId is valid
  User.findById(req.query.userId).exec((err, data) => {
    if (err) return res.send("unknown userId");
    const currUser = data.username;
    ExerciseData.find({userId: req.query.userId}, '-_id -userId', (err, data) => {
      if (!Object.keys(req.query).includes("from") && !Object.keys(req.query).includes("to") && !Object.keys(req.query).includes("limit"))
        return res.json({
          "_id": req.query.userId,
          username: currUser,
          count: data.length,
          log: data
        });
      else if (Object.keys(req.query).includes("from")) {
        if (req.query.from == "") return res.json({"_id": req.query.userId, username: currUser, count: data.length, log: data});
        if (!Object.keys(req.query).includes("to")) {
          let limit = -1;
          if (Object.keys(req.query).includes("limit") && req.query.limit != "") limit = parseInt(req.query.limit);
          const d = new Date(req.query.from);
          const wantFrom = d.getTime();
          const newData = data.filter((dat) => {
            const temp = new Date(dat["date"]);
            const temp2 = temp.getTime();
            return temp2 >= wantFrom;
          });
          return res.json({
            "_id": req.query.userId,
            username: currUser,
            from: d.toUTCString().slice(0, 3) + " " + d.toUTCString().slice(8, 12) + d.toUTCString().slice(5, 8) + d.toUTCString().slice(12, 16),
            count: (limit == -1) ? newData.length : limit > newData.length ? newData.length : limit,
            log: (limit == -1) ? newData : newData.slice(0, limit),
          })
        }
        else if (Object.keys(req.query).includes("to")) {
          let limit = -1;
          if (Object.keys(req.query).includes("limit") && req.query.limit != "") limit = parseInt(req.query.limit);
          const d = new Date(req.query.from);
          const wantFrom = d.getTime();
          const e = new Date(req.query.to);
          const wantTo = e.getTime();
          const newData = data.filter((dat) => {
            const temp = new Date(dat["date"]);
            const temp2 = temp.getTime();
            return temp2 >= wantFrom && temp2 <= wantTo;
          });
          return res.json({
            "_id": req.query.userId,
            username: currUser,
            from: d.toUTCString().slice(0, 3) + " " + d.toUTCString().slice(8, 12) + d.toUTCString().slice(5, 8) + d.toUTCString().slice(12, 16),
            to: e.toUTCString().slice(0, 3) + " " + e.toUTCString().slice(8, 12) + e.toUTCString().slice(5, 8) + e.toUTCString().slice(12, 16),
            count: (limit == -1) ? newData.length : limit > newData.length ? newData.length : limit,
            log: (limit == -1) ? newData : newData.slice(0, limit),
          })
        }
      }
      /////
      else if (Object.keys(req.query).includes("to")) {
        if (req.query.to == "") return res.json({"_id": req.query.userId, username: currUser, count: data.length, log: data});
        if (!Object.keys(req.query).includes("from")) {
          let limit = -1;
          if (Object.keys(req.query).includes("limit") && req.query.limit != "") limit = parseInt(req.query.limit);
          const d = new Date(req.query.to);
          const wantTo = d.getTime();
          const newData = data.filter((dat) => {
            const temp = new Date(dat["date"]);
            const temp2 = temp.getTime();
            return temp2 <= wantTo;
          });
          return res.json({
            "_id": req.query.userId,
            username: currUser,
            to: d.toUTCString().slice(0, 3) + " " + d.toUTCString().slice(8, 12) + d.toUTCString().slice(5, 8) + d.toUTCString().slice(12, 16),
            count: (limit == -1) ? newData.length : limit > newData.length ? newData.length : limit,
            log: (limit == -1) ? newData : newData.slice(0, limit),
          })
        }
        else if (Object.keys(req.query).includes("from")) {
          let limit = -1;
          if (Object.keys(req.query).includes("limit") && req.query.limit != "") limit = parseInt(req.query.limit);
          const d = new Date(req.query.to);
          const wantTo = d.getTime();
          const e = new Date(req.query.from);
          const wantFrom = e.getTime();
          const newData = data.filter((dat) => {
            const temp = new Date(dat["date"]);
            const temp2 = temp.getTime();
            return temp2 >= wantFrom && temp2 <= wantTo;
          });
          return res.json({
            "_id": req.query.userId,
            username: currUser,
            from: d.toUTCString().slice(0, 3) + " " + d.toUTCString().slice(8, 12) + d.toUTCString().slice(5, 8) + d.toUTCString().slice(12, 16),
            to: e.toUTCString().slice(0, 3) + " " + e.toUTCString().slice(8, 12) + e.toUTCString().slice(5, 8) + e.toUTCString().slice(12, 16),
            count: (limit == -1) ? newData.length : limit > newData.length ? newData.length : limit,
            log: (limit == -1) ? newData : newData.slice(0, limit),
          })
        }
      }
      /////
      else if (Object.keys(req.query).includes("limit")) {
        let limit = -1;
        if (Object.keys(req.query).includes("limit") && req.query.limit != "") limit = parseInt(req.query.limit);
        return res.json({
          "_id": req.query.userId,
          username: currUser,
          count: (limit == -1) ? data.length : limit > data.length ? data.length : limit,
          log: (limit == -1) ? data : data.slice(0, limit)
        });
      }
    });
    
  });
});


// Listener 
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
