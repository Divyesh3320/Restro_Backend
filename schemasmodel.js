const mongoose =require('mongoose');
const jwt = require('jsonwebtoken');

const menueschema=mongoose.Schema({
    img:String,
    name:String
});


const usersschema=mongoose.Schema({
    admin:Number,
    name:String,
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true
    },
    password:Number,
    likes:Array,
    tokens:[
        {
            token:{
                type:String,
                required:true
            }
        }
    ]  
});


usersschema.methods.generateToken= async function (req,res) {
    try{
        const token=jwt.sign({_id:this._id},'aaaaaaaaaa')
        this.tokens=this.tokens.concat({token:token})
        return token;
    }catch(error){
        throw new Error(error); 
    }
}


const foodschema=mongoose.Schema({
    img:String,
    name:String,
    price:Number,
    type:String
});

const bookingchema=mongoose.Schema({
    userid:mongoose.ObjectId,
    name:String,
    email:String,
    contactno:Number,
    description:String,
    time:String,
    date:String,
    bookingdate:Date,
    status:String
});

const reviewschema=mongoose.Schema({
    favouratefood:String,
    notlikefood:String,
    changes:String,
    othersuzzetion:String,
    status:String
});

booking=mongoose.model("Booking",bookingchema)
users=mongoose.model('User',usersschema);
menue= mongoose.model('Menue',menueschema);
foods=mongoose.model('foods',foodschema)
reviews=mongoose.model('review',reviewschema);

module.exports = {
    menue: menue,
    foods:foods,
    users:users,
    booking:booking,
    reviews:reviews
};