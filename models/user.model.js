const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true
    },
    lastName:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true,
        unique:true
    },
    password:{
        type:String,
        required:true,
    },
    phone:{
        type:String,
        required:true
    },
    profileImage:{
        type:String,
        default:"https://res.cloudinary.com/de1lvlqme/image/upload/v1749566197/vecteezy_default-profile-account-unknown-icon-black-silhouette_20765399_ldtak0.jpg",
    },
    profileImageId:{
        type:String,
        default:null,
    },
    role:{
        type:String,
        enum:["admin","driver"],
        default:"driver",
    }


},{timestamps:true});


module.exports = mongoose.model('User',userSchema);