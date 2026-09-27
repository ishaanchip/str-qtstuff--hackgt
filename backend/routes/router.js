const express  = require("express");
const axios = require('axios')
const router = express.Router();
const schemas = require("../models/schema");

//GENERAL ROUTES
router.use(require("./create-account"));
router.use(require("./check-account"));
router.use(require("./login"));
router.use(require("./get-account"));
router.use(require("./update-image"));

module.exports = router;