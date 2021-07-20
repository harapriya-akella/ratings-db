const express = require("express");
const router = express.Router();
const Setting = require("../models/settings_schema");

router.get("/list", (req, res) => {
    Setting.find({}, { __v: 0, _id: 0 }, (err, data) => {
        res.send({ 'status': 1, data })
    })
})

router.post("/create", async (req, res) => {
    var finalInsert = {
        week_number: 0,
        is_process_complete: 1
    }
    var settingCreate = await Setting.create(finalInsert)
    res.send({ 'status': 1, data: settingCreate })
})

module.exports = router;