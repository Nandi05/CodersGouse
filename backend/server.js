require('dotenv').config();
const express=require('express');
const app=express();
const DbConnect=require('./database');
const router=require('./routes');
const PORT=process.env.PORT || 5500;
const cors=require('cors');
DbConnect();

const corsOption={
    origin: ['http://localhost:3000'],
}
app.use(cors())
app.use(express.json());
app.use(router);
app.get('/',(req,res)=>{
    res.send('Hello from express js')
})



app.listen(PORT, ()=> console.log(`Listening on port ${PORT}`));
