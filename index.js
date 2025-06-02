require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
const cors = require("cors");

//midleware
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("career code server is running.......");
});

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
    const jobColl = client.db('jobPortalDB').collection('jobs');
    const applicationColl = client.db("jobPortalDB").collection('applications');


    app.get('/jobs', async(req, res) => {
       const result = await jobColl.find().toArray();
       res.send(result)
    })

    app.post('/jobs', async(req, res) => {
        const newJob = req.body;
        const result = await jobColl.insertOne(newJob);
        res.send(result)
    }) 
    app.get('/recent/jobs', async(req, res) => {
        const sortBy = {post_date: -1}
        const result = await jobColl.find().sort(sortBy).limit(3).toArray();
        res.send(result)
    })

    app.get('/jobs/details/:id', async(req, res) => {
       const query = { _id: new ObjectId(req.params.id)}
       const result = await jobColl.findOne(query);
       res.send(result)
    })


    //applications related apis
    app.post('/application/apply', async(req, res) => {
      const result = await applicationColl.insertOne(req.body);
      res.send(result)
    })

    app.get("/application/my", async(req, res) => {
       const user = req.query.email;      
       const result = await applicationColl.find({email: user}).toArray();

       //get specific job data by job id
       for(const application of result){
        const job = await jobColl.findOne({ _id: new ObjectId(application.jobId) });

         application.job_title = job.job_title;
         application.company_name = job.company_name;        
         application.location = job.location;        
         
       }
       res.send(result)
    })

    app.delete('/application/delete/:id', async(req, res) => {
       const result = await applicationColl.deleteOne({_id: new ObjectId(req.params.id)});
       res.send(result)
    })


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
