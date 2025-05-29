const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
const cors = require("cors");

//midleware
app.use(cors());
app.use(express.json());


app.get('/', (req, res) => {
    res.send('career code server is running.......')
})


app.listen(port, () => {
    console.log('server is listening on port:', port)
})