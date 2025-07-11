require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const admin = require("firebase-admin");
const verifyEmail = require('./middleware/verifyEmail');
const app = express();
const port = process.env.PORT || 3000;
const cors = require("cors");

//midleware
app.use(cors());
app.use(express.json());

//firebase admin set up
const serviceAccount = require("./firebase_private_key.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

//middle ware to verify firebase token
const verifyFirebaseToken = async(req, res, next) => {
   const authHeader = req.headers.authorization;
    console.log(authHeader)
   if(!authHeader || !authHeader.startsWith("Bearer ") ){
     return res.status(401).send({ message: "No token provided." });
   }

   const token = authHeader.split(' ')[1];
   console.log(token)
   try {
    const decodedToken = await admin.auth().verifyIdToken(token);
     req.user = decodedToken;
     next() 

   } catch(error) {
     return  res.status(403).send({ message: "Invalid or expired token." });
   }
}

const uri = process.env.DB_URI;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const jobColl = client.db("jobPortalDB").collection("jobs");
    const applicationColl = client.db("jobPortalDB").collection("applications");

    //Job related apis
    app.get("/jobs", async (req, res) => {
      let query = {};
      if (req.query.email) {
        query = { hr_email: req.query.email };
      }
      const result = await jobColl.find(query).toArray();
      for (const job of result) {
        const applicationQuery = { jobId: job._id.toString() };
        const applicants = await applicationColl.countDocuments(
          applicationQuery
        );
        job.applicants = applicants;
      }
      res.send(result);
    });

    app.post("/jobs", async (req, res) => {
      const newJob = req.body;
      const result = await jobColl.insertOne(newJob);
      res.send(result);
    });
    app.get("/recent/jobs", async (req, res) => {
      const sortBy = { post_date: -1 };
      const result = await jobColl.find().sort(sortBy).limit(3).toArray();
      res.send(result);
    });

    app.get("/jobs/details/:id", async (req, res) => {
      const query = { _id: new ObjectId(req.params.id) };
      const result = await jobColl.findOne(query);
      res.send(result);
    });

    //applications related apis
    app.get("/application/my", verifyFirebaseToken, verifyEmail, async (req, res) => {
      const user = req.query.email;
      const result = await applicationColl.find({ email: user }).toArray();

      for (const application of result) {
        const job = await jobColl.findOne({
          _id: new ObjectId(application.jobId),
        });

        application.job_title = job.job_title;
        application.company_name = job.company_name;
        application.location = job.location;
      }
      res.send(result);
    });

    app.get("/applications/job/:job_id", async (req, res) => {
      const result = await applicationColl
        .find({ jobId: req.params.job_id })
        .toArray();
      res.send(result);
    });

    app.post("/application/apply", async (req, res) => {
      const result = await applicationColl.insertOne(req.body);
      res.send(result);
    });

    app.patch("/applications/:id", async (req, res) => {
      const { id } = req.params;
      const filter = { _id: new ObjectId(id) };
      const updatedField = {
        $set: {
          status: req.body.status,
        },
      };

      const result = await applicationColl.updateOne(filter, updatedField, {
        upsert: true,
      });
      res.send(result);
    });

    app.delete("/application/delete/:id", async (req, res) => {
      const result = await applicationColl.deleteOne({
        _id: new ObjectId(req.params.id),
      });
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log("server is listening on port:", port);
});
