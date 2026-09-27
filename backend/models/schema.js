const { Int32 } = require('mongodb');
const mongoose = require('mongoose');

const Schema = mongoose.Schema;

//client account schemas


//commentary schema
const clientAccountSchema = new Schema({
    first_name: {
        type: String,
        required: true,
        unique: true
      },
    last_name: {
        type: String,
        default: "Series"
    },
    email:{
        type:String,
        required:true,
        unique:true
    },
    password:{
        type:String,
        required:true
    },
    ref_img:{
        type:String,
        required:true
    },
    gender:{
        type:String,
        required:true
    },

    /*
    each object smth like this
    {
        outfit_name: "blue heavy focus...",
        outfit_items:[
            {
                item_name:String,
                item_img:String,
                item_url:String

            }
        ],
        try_on_video:video

    }

    */
    past_outfits: {
        type: [Object],
        default: []
    }

})



const accounts = mongoose.model('accounts', clientAccountSchema, 'accounts');

// models/schema.js
module.exports = { accounts };