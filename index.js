const express=require('express')
const cors=require('cors')
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app=express()
const port=process.env.PORT || 5000 ;

// midleware---------------
 app.use(cors({
  origin:[
    'http://localhost:5173',
    // 'cars-doctor-f2736.web.app',
    // 'cars-doctor-f2736.firebaseapp.com',
  ],
  credentials:true
 }))
 app.use(express.json());

 app.use(cookieParser())
 

 app.get('/',(req,res)=>{
    res.send('Doctor server is running')
 })

// console.log(process.env.DB_USER)

// middlesWares -----------------------

const logger=async(req,res,next)=>{
  console.log(req.method , req.url)
  next()
}
const verifyToken = async(req,res,next)=>{
  const token=req?.cookies?.token ;
  // console.log('token use in middleware :' ,token)
  // no token available
  if(!token){
    return res.status(401).send({message:'unauthorized access'})
  }
  jwt.verify(token,process.env.JWT_ACCESS_TOKEN,(err,decoded)=>{
    if(err){
      return res.status(401).send({message:'unAuthorized'})
    }
    else{
      req.user=decoded;
      next()
    }
  })
  
}




 const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vmhty.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
 
 // Create a MongoClient with a MongoClientOptions object to set the Stable API version
 const client = new MongoClient(uri, {
   serverApi: {
     version: ServerApiVersion.v1,
     strict: true,
     deprecationErrors: true,
   }
 });
 
 const cookieOption={
  httpOnly:true,
  secure:process.env.NODE_ENV==="prodection"?true:false,
  sameSite:process.env.NODE_ENV==="production"?"none":"strict"  
}

 async function run() {
   try {
     // Connect the client to the server	(optional starting in v4.7)
    //  await client.connect();

     const serviceCollection=client.db("carsDoctor").collection("services");

     const bookingCollection=client.db("carsDoctor").collection("booking")
    //  ---------------Auth related api ----------------
  app.post('/jwt',logger, async(req,res)=>{
    const user=req.body;
    console.log(user);
    const token =jwt.sign(user,process.env.JWT_ACCESS_TOKEN,{expiresIn:'1h'})
    res.cookie('token',token,cookieOption)
    .send({success:true})
  })

  app.post('/logOut',async(req,res)=>{
    const user=req.body;
    console.log('user log out token:',user)
    res.clearCookie('token',{cookieOption,maxAge:0}).send({success:true})
  })
// -------------------services related api -------------------------
     app.get('/services', async(req,res)=>{
      const filter=req.query
      console.log(filter)
      // do not work because 150 and 30 are not a number
      // const query={
      //  price:{$lt : 150, $gt:30}
      // }
      const query={
       title:{$regex: filter.search, $options:'i'}
      }
      const options={
        sort:{
          price:filter.sort=== 'asc'? 1:-1}
      }
        const cursor=serviceCollection.find(query,options)
        const result=await cursor.toArray()
        res.send(result)
     })

     app.get('/services/:id',async(req,res)=>{
        const id=req.params.id ;
        const query={_id:new ObjectId(id)}
        const options = {
            
            // Include only the `title` and `imdb` fields in the returned document
            projection: {  title: 1, price: 1,service_id:1,img:1 },
          };
          const result=await serviceCollection.findOne(query,options)
          res.send(result)
     })

    //  ------------- booking operation ------------------
  
  app.get('/bookings',logger,verifyToken, async(req,res)=>{
    console.log(req.query.email)
    // console.log('cook cook cookies :',req.cookies)
    console.log("user in the valid token",req.user)
    if(req.user.email !== req.query.email){
      return res.status(403).send({message:'forbiden access'})
    }
    let query={}
    if(req.query.email){
      query={email:req.query.email}
    }
    const result=await bookingCollection.find(query).toArray()
    res.send(result)
  })

    app.post('/bookings',async(req,res)=>{
      const booking=req.body ;
      console.log(booking)
      const result=await bookingCollection.insertOne(booking) ;
      res.send(result);
    })

    app.patch('/bookings/:id',async(req,res)=>{
      const id=req.params.id ;
      const filter={_id:new ObjectId(id)}
      const updatedBooking=req.body
      console.log(updatedBooking)
      const updateDoc = {
        $set: {
          status:updatedBooking.status,
 
        },
      };
      const result=await bookingCollection.updateOne(filter,updateDoc)
      res.send(result)
    })



    app.delete('/bookings/:id',async(req,res)=>{
      const id=req.params.id ;
      const query={_id:new ObjectId(id)}
      const result=await bookingCollection.deleteOne(query)
      res.send(result)
     })

     // Send a ping to confirm a successful connection
     await client.db("admin").command({ ping: 1 });
     console.log("Pinged your deployment. You successfully connected to MongoDB!");
   } finally {
     // Ensures that the client will close when you finish/error
    //  await client.close();
   }
 }
 run().catch(console.dir);
 

 app.listen(port,()=>{
    console.log(`Doctor server site is running ${port}`)
})
 