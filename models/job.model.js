const mongoose = require("mongoose");

const locationSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
},
  phone: { 
    type: String, 
    required: true 
},
  email:{ 
    type: String 
},
  longitude: { 
    type: String, 
    required: true 
},
  latitude: { 
    type: String, 
    required: true 
}
}, { _id: false });

const jobSchema = mongoose.Schema({
  driverInfo: {
    id: { 
        type: String, 
        required: true 
    },
    name: { 
        type: String, 
        required: true 
    },
    phone: { 
        type: String, 
        required: true 
    }
  },
  pickupInfo: locationSchema,
  dropoffInfo: locationSchema,
  currentCoords: {
    longitude: { 
        type: String, 
        default: null 
    },
    latitude: { 
        type: String, 
        default: null 
    }
  },
  status: {
    type: String,
    enum: ["pending", "in-transit", "delayed", "delivered", "cancelled"],
    default: "pending",
    required: true
  },
  note: { type: String, 
    default:null
  },
  addOns: {
    fragileItems: { type: Boolean },
    heavyItem: { type: Boolean }
  },
  isUrgent: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });


module.exports = mongoose.model("Job", jobSchema);
