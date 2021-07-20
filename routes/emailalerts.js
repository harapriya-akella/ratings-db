const express = require("express");
const router = express.Router();
var moment = require("moment");
const Email_alerts = require("../models/emailalerts_schema");
const Merge = require("../models/merge_schema");

router.post("/create", async (req, res) => {
    var find_query = {}
    var query_arr = []

    query_arr.push({ averageRating: { $gte: "6" } })
    if (req.body.startYear && req.body.startYearOperator) {
        query_arr.push({ startYear: { [req.body.startYearOperator]: req.body.startYear.toString() } })
    }
    if (req.body.averageRating && req.body.averageRatingOperator) {
        if (req.body.averageRating.toString() != "6" && req.body.averageRatingOperator != "$gte") {
            query_arr.push({ averageRating: { [req.body.averageRatingOperator]: req.body.averageRating.toString() } })
        }
    }
    if (req.body.numVotes && req.body.numVotesOperator) {
        query_arr.push({ numVotes: { [req.body.numVotesOperator]: req.body.numVotes.toString() } })
    }
    if (req.body.series_type) {
        query_arr.push({ titleType: { $eq: req.body.series_type } })
    }
    if (req.body.language) {
        query_arr.push()
        var language_query_arr = []
        req.body.language.forEach(element => {
            language_query_arr.push({ language: { $eq: element } })
        });
        var language_query = { $or: language_query_arr }
        query_arr.push(language_query)
    }
    if (req.body.region) {
        var region_query_arr = []
        req.body.region.forEach(element => {
            region_query_arr.push({ region: { $eq: element } })
        });
        var region_query = { $or: region_query_arr }
        query_arr.push(region_query)
    }
    if (req.body.genres) {
        var genre_query_arr = []
        if (req.body.genres != "all") {
            req.body.genres.forEach(element => {
                genre_query_arr.push({ genres: { $regex: new RegExp(element), $options: 'i' } })
            });
        }
        var genre_query = { $or: genre_query_arr }
        query_arr.push(genre_query)
    }
    if (req.body.title) {
        query_arr.push({ primaryTitle: new RegExp(req.body.title, 'i') })
    }
    if (query_arr.length > 0) {
        find_query = { $and: query_arr }
    }
    if (req.body.sentAlertTo) {
        var sentAlertTo = req.body.sentAlertTo
    } else {
        var sentAlertTo = "santosh.kumar@goquestmedia.com,akshit.sandhu@goquestmedia.com,vivek@goquestmedia.com"
    }
    var frequency = req.body.frequency
    date = new Date()
    next_date_of_fire = date.setTime(date.getTime() + Number(frequency) * 86400000);
    next_date_of_fire = moment(next_date_of_fire).format("LLLL");
    var emailAlerts = {
        sent_to: sentAlertTo,
        query: req.body,
        name: req.body.name,
        frequency,
        next_date_of_fire,
        created_on: moment(new Date()).format("LLLL")
    }
    var analysis_count = await Merge.countDocuments(find_query)
    Email_alerts.create(emailAlerts, (err, emailcreate) => {
        // console.log("err", err);
        // console.log("emailcreate", emailcreate);
        var emailtest = {
            "fromEmail": "",
            "fromName": "",
            "hostname": "smtp.sparkpostmail.com",
            "userName": "SMTP_Injection",
            "apiKey": ""
        }
        const nodemailer = require("nodemailer");
        var transporter = nodemailer.createTransport({
            host: emailtest.hostname,
            port: 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: emailtest.userName,
                pass: emailtest.apiKey
            }
        });
        var mailOptions = "";
        link =
            "<p>ALERT RAISED BY ACQUISITION TEAM</p><p>Click on the link below to see the list</p><p><a href = 'http://139.59.18.134:5000/createalerts?id=" + emailcreate._id + "'>" + req.body.name + "</a></p>";
        mailOptions = {
            from: emailtest.fromEmail,
            to: sentAlertTo,
            subject: "ALERTS EMAIL",
            html: link
        };
        console.log("sending email...");
        transporter.sendMail(mailOptions, async function (error, info) {
            console.log("sending email...", error, info);
            if (error) {
                res.send({ 'status': 0, message: error.response })
            } else {
                res.send({ 'status': 1, data: emailAlerts, message: 'Email successfully sent to ' + mailOptions.to, error })
            }
        });
    })
})

router.get("/check_for_email_alerts", (req, res) => {
    var allAlerts = []
    Email_alerts({}, (err, alerts) => {
        if (alerts.length > 0) {
            alerts.forEach(element => {
                allAlerts.push(element._id)
            });
            k = 0;
            loopArray()
            function loopArray() {
                if (k < alerts.length) {
                    bringData(() => {
                        k++;
                        loopArray()
                    })
                } else {
                    res.send({ 'status': 1, 'message': "Done" })
                }
            }
            function bringData(callback) {
                var query = { _id: allAlerts[k] }
                Email_alerts.findOne(query, (err, emailSingle) => {
                    if (emailSingle) {
                        var date_now = moment(new Date).format("L")
                        var date_to_check = moment(emailSingle.next_date_of_fire).format("L")
                        if (date_now == date_to_check) {
                            date = emailSingle.next_date_of_fire
                            next_date_of_fire = date.setTime(date.getTime() + Number(frequency) * 86400000);
                            var update = { next_date_of_fire }

                            Email_alerts.updateOne(query, update, (err, update) => {
                                callback()
                            })
                        }
                    } else {
                        callback()
                    }
                })
            }
        } else {
            res.send({ 'status': 1, 'message': "No email alerts pending" })
        }
    })
})

router.post("/list", async (req, res) => {
    var find_query = {}
    if (req.body.email_id) {
        find_query._id = req.body.email_id
    }
    Email_alerts.find(find_query, (err, emails) => {
        if (err) {
            res.send({ 'status': 0, data: err.stack })
        } else {
            res.send({ 'status': 1, data: emails })
        }
    }).sort({ _id: -1 })
})

router.post("/remove", async (req, res) => {
    var query = { _id: req.body.email_id }
    var data = await Email_alerts.find({})
    Email_alerts.find(query, (err, emails) => {
        if (emails.length > 0) {
            Email_alerts.deleteOne(query, async (err, del) => {
                if (err) {
                    res.send({ 'status': 0, message: 'Not Successful', data })
                } else {
                    var data = await Email_alerts.find({})
                    res.send({ 'status': 1, message: 'Successful', data })
                }
            })
        } else {
            res.send({ 'status': 0, message: 'Not Successful', data })
        }
    })
})

module.exports = router;
