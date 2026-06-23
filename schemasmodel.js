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
    type:String,
    description: { type: String, default: '' },
    adminRatingBoost: { type: Number, default: 0, min: 0, max: 5 }
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

// ---- Food User Ratings (one per user per food) ----
const foodRatingSchema = mongoose.Schema({
    foodId: { type: mongoose.Schema.Types.ObjectId, ref: 'foods', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User',  required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    createdAt: { type: Date, default: Date.now }
});
foodRatingSchema.index({ foodId: 1, userId: 1 }, { unique: true });

booking=mongoose.model("Booking",bookingchema)
users=mongoose.model('User',usersschema);
menue= mongoose.model('Menue',menueschema);
foods=mongoose.model('foods',foodschema)
reviews=mongoose.model('review',reviewschema);
foodRatings=mongoose.model('FoodRating',foodRatingSchema);

// ---- Site Configuration Schema ----
const siteConfigSchema = mongoose.Schema({
    logoUrl: { type: String, default: '' },
    siteName: { type: String, default: 'Kudoz Restro' },
    updatedAt: { type: Date, default: Date.now }
});
siteConfig = mongoose.model('SiteConfig', siteConfigSchema);

// ---- Gallery Schema ----
const gallerySchema = mongoose.Schema({
    title: { type: String, default: '' },
    img: { type: String, required: true },
    size: { type: String, default: 'small' },
    order: { type: Number, default: 0 }
});
gallery = mongoose.model('Gallery', gallerySchema);

// ---- Hero/Slider Image Schema (single document) ----
const sliderImageSchema = mongoose.Schema({
    imgUrl:    { type: String, default: '' },
    updatedAt: { type: Date,   default: Date.now }
});
sliderImage = mongoose.model('SliderImage', sliderImageSchema);

// ---- Event Section Images Schema (max 5 images) ----
const eventImageSchema = mongoose.Schema({
    img:   { type: String, required: true },
    alt:   { type: String, default: 'Event' },
    order: { type: Number, default: 0 }
});
eventImages = mongoose.model('EventImage', eventImageSchema);

module.exports = {
    menue:        menue,
    foods:        foods,
    users:        users,
    booking:      booking,
    reviews:      reviews,
    siteConfig:   siteConfig,
    gallery:      gallery,
    sliderImage:  sliderImage,
    eventImages:  eventImages,
    foodRatings:  foodRatings
};