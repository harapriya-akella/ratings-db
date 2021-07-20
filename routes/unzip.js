const express = require("express");
const router = express.Router();
const Merge = require("../models/merge_schema");
const Cron_table = require("../models/cron_table_schema");
const config = require("config")
const Country = require("../models/country_schema");
const Language = require("../models/language_schema");
const Setting = require("../models/settings_schema");
const Margin_of_1 = require("../models/margin_of_1_schema")
const Above_6 = require("../models/above_6_schema")
const Below_6 = require("../models/below_6_schema")
const Above_500_votes = require("../models/above_500_votes_schema")

router.get("/margin_of_1", async (req, res) => {
    var setting = await Setting.findOne({})
    var operation_date = setting.this_week_folder_name
    var cron_query = { operation_date }
    var cron_table = await Cron_table.findOne(cron_query)
    var tConstArr = []
    // margin_of_1_start: Number,
    // margin_of_1_start_datetime: Date,
    // margin_of_1_end: Number,
    // margin_of_1_end_datetime: Date,
    Margin_of_1.find({}, async (err, data) => {
        if (err) {
            res.send({ status: 0, message: "Failed to get data" })
        } else {
            if (data.length > 0) {
                data.forEach(element => {
                    tConstArr.push({ tconst: element.tconst, language: element.language, region: element.region })
                });
                var lang_arr = await Language.find({}, { __v: 0, _id: 0 })
                var coun_arr = await Country.find({}, { __v: 0, _id: 0 })
                k = 0
                loopArray()
                function loopArray() {
                    if (k < tConstArr.length) {
                        bringData(() => {
                            k++;
                            loopArray()
                        })
                    } else {
                        res.send({ status: 1, data, count: data.length })
                    }
                }
                function bringData(callback) {
                    var arr_L = []
                    var arr_R = []
                    var arr_R_final = []
                    var arr_L_final = []
                    var L = tConstArr[k].language
                    var R = tConstArr[k].region
                    L.forEach(element => {
                        element == "" ? null : arr_L.push(element)
                    });
                    R.forEach(element => {
                        element == "" ? null : arr_R.push(element)
                    });
                    // *******
                    for (let i = 0; i < arr_L.length; i++) {
                        lang_arr.find(element => element.code == arr_L[i] ? arr_L_final.push(element.name) : null)
                    }
                    for (let i = 0; i < arr_R.length; i++) {
                        coun_arr.find(element => element.code == arr_R[i] ? arr_R_final.push(element.name) : null)
                    }
                    data[k].language = arr_L_final.join(", ")
                    data[k].region = arr_R_final.join(", ")
                    callback()
                    return;
                    // *******
                    // ja,en,mk,fr,bg
                    Country.find({ code: { $in: arr_R } }, (err, coun) => {
                        // console.log("coun", coun);
                        coun.forEach(element => {
                            arr_R_final.push(element.name)
                        });
                        Language.find({ code: { $in: arr_L } }, (err, lang) => {
                            // console.log("lang", lang);
                            lang.forEach(element => {
                                arr_L_final.push(element.name)
                            });
                            data[k].language = arr_L_final.join(", ")
                            data[k].region = arr_R_final.join(", ")
                            callback()
                        })
                    })
                }
            } else {
                res.send({ 'status': 1, data: [] })
            }
        }
    })
    return false;
    if ((cron_table.margin_of_1_start == 0 && cron_table.margin_of_1_end == 0) && (cron_table.margin_of_1_start == 1 && cron_table.margin_of_1_end == 0)) {
        if (cron_table.margin_of_1_start == 0) {
            var update_query = { margin_of_1_start: 1, margin_of_1_start_datetime: new Date() }
            var update_cron = await Cron_table.updateOne(cron_query, update_query)
        } else {
            if (cron_table.week_number == 1) {
                var update_query = { margin_of_1: 0, margin_of_1_end: 1, margin_of_1_end_datetime: new Date() }
                var update_cron = await Cron_table.updateOne(cron_query, update_query)
            } else {
                var present = cron_table.week_number
                var past = Number(cron_table.week_number) - 1

                var rating_present = "week" + present + "_rating"
                var rating_past = "week" + past + "_rating"

                // ****
                var titleIDs = []
                var ratings = []
                var votes = []
                var margin_of_1 = 0

                var allMerges = await Merge.find({})

                allMerges.forEach(element => {
                    titleIDs.push(element.tconst)
                    votes.push(element.numVotes)
                    ratings.push(element.averageRating)
                });

                k = 0;
                loopArray()
                async function loopArray() {
                    if (k < titleIDs.length) {
                        bringData(() => {
                            k++;
                            loopArray()
                        })
                    } else {
                        var update_query = { margin_of_1, margin_of_1_end: 1, margin_of_1_end_datetime: new Date() }
                        var update_cron = await Cron_table.updateOne(cron_query, update_query)
                    }
                }
                async function bringData(callback) {
                    Merge.findOne({ tconst: titleIDs[k] }, async (err, merge) => {
                        console.log(titleIDs[k], k, titleIDs.length);

                        var present = merge[rating_present]
                        var past = merge[rating_past]

                        if (Number(present - past) > 1) {
                            margin_of_1++;
                            var create_merge = await Margin_of_1.create(merge)
                        }
                        callback()
                    })
                }
                // ****

            }
        }
    }
})

router.get("/below_6", async (req, res) => {
    var setting = await Setting.findOne({})
    var operation_date = setting.this_week_folder_name
    var cron_query = { operation_date }
    var cron_table = await Cron_table.findOne(cron_query)
    var tConstArr = []
    if (setting.is_process_complete == 1) {
        var week_number = setting.week_number
    } else {
        var week_number = Number(setting.week_number - 1)
    }
    var present = week_number
    var past = week_number - 1

    var rating_present = "week" + present + "_rating"
    var rating_past = "week" + past + "_rating"
    Merge.find({ [rating_present]: { $exists: false } }, async (err, data) => {
        if (err) {
            res.send({ 'status': 0, message: err.stack, data: [] })
        } else {
            if (data.length > 0) {
                // res.send({ 'status': 1, data: merge })
                data.forEach(element => {
                    tConstArr.push({ tconst: element.tconst, language: element.language, region: element.region })
                });
                var lang_arr = await Language.find({}, { __v: 0, _id: 0 })
                var coun_arr = await Country.find({}, { __v: 0, _id: 0 })
                k = 0
                loopArray()
                function loopArray() {
                    if (k < tConstArr.length) {
                        bringData(() => {
                            k++;
                            loopArray()
                        })
                    } else {
                        res.send({ status: 1, data, count: data.length })
                    }
                }
                function bringData(callback) {
                    var arr_L = []
                    var arr_R = []
                    var arr_R_final = []
                    var arr_L_final = []
                    var L = tConstArr[k].language
                    var R = tConstArr[k].region
                    L.forEach(element => {
                        element == "" ? null : arr_L.push(element)
                    });
                    R.forEach(element => {
                        element == "" ? null : arr_R.push(element)
                    });
                    // *******
                    for (let i = 0; i < arr_L.length; i++) {
                        lang_arr.find(element => element.code == arr_L[i] ? arr_L_final.push(element.name) : null)
                    }
                    for (let i = 0; i < arr_R.length; i++) {
                        coun_arr.find(element => element.code == arr_R[i] ? arr_R_final.push(element.name) : null)
                    }
                    data[k].language = arr_L_final.join(", ")
                    data[k].region = arr_R_final.join(", ")
                    callback()
                    return;
                    // *******
                    // ja,en,mk,fr,bg
                    Country.find({ code: { $in: arr_R } }, (err, coun) => {
                        // console.log("coun", coun);
                        coun.forEach(element => {
                            arr_R_final.push(element.name)
                        });
                        Language.find({ code: { $in: arr_L } }, (err, lang) => {
                            // console.log("lang", lang);
                            lang.forEach(element => {
                                arr_L_final.push(element.name)
                            });
                            data[k].language = arr_L_final.join(", ")
                            data[k].region = arr_R_final.join(", ")
                            callback()
                        })
                    })
                }
            } else {
                res.send({ 'status': 1, data: [] })
            }
        }
    })
    return;
    Below_6.find({}, (err, data) => {
        if (err) {
            res.send({ status: 0, message: "Failed to get data" })
        }
        if (data) {
            res.send({ status: 1, data: data })
        } else {
            res.send({ status: 1, data: [] })
        }
    })
    return false;
    if ((cron_table.below_6_start == 0 && cron_table.below_6_end == 0) && (cron_table.below_6_start == 1 && cron_table.below_6_end == 0)) {
        if (cron_table.below_6_start == 0) {
            var update_query = { below_6_start: 1, below_6_start_datetime: new Date() }
            var update_cron = await Cron_table.updateOne(cron_query, update_query)
        } else {
            if (cron_table.week_number == 1) {
                var update_query = { below_6: 0, below_6_end: 1, below_6_end_datetime: new Date() }
                var update_cron = await Cron_table.updateOne(cron_query, update_query)
            } else {
                var present = cron_table.week_number
                var past = Number(cron_table.week_number) - 1

                var rating_present = "week" + present + "_rating"
                var rating_past = "week" + past + "_rating"

                // ****
                var titleIDs = []
                var ratings = []
                var votes = []
                var below_6 = 0

                var allMerges = await Merge.find({})

                allMerges.forEach(element => {
                    titleIDs.push(element.tconst)
                    votes.push(element.numVotes)
                    ratings.push(element.averageRating)
                });

                k = 0;
                loopArray()
                async function loopArray() {
                    if (k < titleIDs.length) {
                        bringData(() => {
                            k++;
                            loopArray()
                        })
                    } else {
                        var update_query = { below_6, below_6_end: 1, below_6_end_datetime: new Date() }
                        var update_cron = await Cron_table.updateOne(cron_query, update_query)
                    }
                }
                async function bringData(callback) {
                    Merge.findOne({ tconst: titleIDs[k] }, async (err, merge) => {
                        console.log(titleIDs[k], k, titleIDs.length);

                        var present = merge[rating_present]
                        var past = merge[rating_past]

                        if (present < 6 && past > 6) {
                            below_6++;
                            var create_merge = await Below_6.create(merge)
                        }
                        callback()
                    })
                }
                // ****

            }
        }
    }
})

router.get("/above_500_votes", async (req, res) => {
    var setting = await Setting.findOne({})
    var operation_date = setting.this_week_folder_name
    var cron_query = { operation_date }
    var cron_table = await Cron_table.findOne(cron_query)
    var tConstArr = []
    var present = cron_table.week_number
    Above_500_votes.find({}, async (err, data) => {
        if (err) {
            res.send({ status: 0, message: "Failed to get data" })
        } else {
            if (data.length > 0) {
                // res.send({ status: 1, data: data })
                data.forEach(element => {
                    tConstArr.push({ tconst: element.tconst, language: element.language, region: element.region })
                });
                var lang_arr = await Language.find({}, { __v: 0, _id: 0 })
                var coun_arr = await Country.find({}, { __v: 0, _id: 0 })
                k = 0
                loopArray()
                function loopArray() {
                    if (k < tConstArr.length) {
                        bringData(() => {
                            k++;
                            loopArray()
                        })
                    } else {
                        res.send({ status: 1, data, count: data.length })
                    }
                }
                function bringData(callback) {
                    var arr_L = []
                    var arr_R = []
                    var arr_R_final = []
                    var arr_L_final = []
                    var L = tConstArr[k].language
                    var R = tConstArr[k].region
                    L.forEach(element => {
                        element == "" ? null : arr_L.push(element)
                    });
                    R.forEach(element => {
                        element == "" ? null : arr_R.push(element)
                    });
                    // *******
                    for (let i = 0; i < arr_L.length; i++) {
                        lang_arr.find(element => element.code == arr_L[i] ? arr_L_final.push(element.name) : null)
                    }
                    for (let i = 0; i < arr_R.length; i++) {
                        coun_arr.find(element => element.code == arr_R[i] ? arr_R_final.push(element.name) : null)
                    }
                    data[k].language = arr_L_final.join(", ")
                    data[k].region = arr_R_final.join(", ")
                    callback()
                    return;
                    // *******
                    // ja,en,mk,fr,bg
                    Country.find({ code: { $in: arr_R } }, (err, coun) => {
                        // console.log("coun", coun);
                        coun.forEach(element => {
                            arr_R_final.push(element.name)
                        });
                        Language.find({ code: { $in: arr_L } }, (err, lang) => {
                            // console.log("lang", lang);
                            lang.forEach(element => {
                                arr_L_final.push(element.name)
                            });
                            data[k].language = arr_L_final.join(", ")
                            data[k].region = arr_R_final.join(", ")
                            callback()
                        })
                    })
                }

            } else {
                res.send({ status: 1, data: [] })
            }
        }
    })
    return false;
    if (present == 1) {
        var update_query = { above_500_votes: 0, above_500_votes_end: 1, above_500_votes_end_datetime: new Date() }
        var update_cron = await Cron_table.updateOne(cron_query, update_query)
    } else {
        var past = Number(cron_table.week_number) - 1

        var votes_present = "week" + present + "_votes"
        var rating_present = "week" + present + "_rating"

        var votes_past = "week" + past + "_votes"

        var titleIDs = []
        var votes = []
        var above_500_votes = 0

        var allMerges = await Merge.find({ [rating_present]: { $gte: "6" } })

        allMerges.forEach(element => {
            titleIDs.push(element.tconst)
            votes.push(element.numVotes)
        });

        k = 0;
        loopArray()
        async function loopArray() {
            if (k < titleIDs.length) {
                bringData(() => {
                    k++;
                    loopArray()
                })
            } else {
                var update_query = { above_500_votes, above_500_votes_end: 1, above_500_votes_end_datetime: new Date() }
                var update_cron = await Cron_table.updateOne(cron_query, update_query)
            }
        }
        async function bringData(callback) {
            Merge.findOne({ tconst: titleIDs[k] }, async (err, merge) => {
                console.log(titleIDs[k], k, titleIDs.length);

                var present = merge[votes_present]
                var past = merge[votes_past]

                if (Number(past - present) >= 500) {
                    above_500_votes++;
                    var create_merge = await Above_500_votes.create(merge)
                }
                callback()
            })
        }
    }
})

router.get("/above_6", async (req, res) => {
    var setting = await Setting.findOne({})
    var operation_date = setting.this_week_folder_name
    var cron_query = { operation_date }
    var cron_table = await Cron_table.findOne(cron_query)
    var tConstArr = []
    // var above_6 = await Merge.find({ [rating_past]: { $exists: false } }).count()
    // var below_6 = await Merge.find({ $and: [{ [rating_past]: { $exists: true } }, { [rating_present]: { $exists: false } }] }).count()

    if (setting.is_process_complete == 1) {
        var week_number = setting.week_number
    } else {
        var week_number = Number(setting.week_number - 1)
    }
    var present = week_number
    var past = week_number - 1

    var rating_present = "week" + present + "_rating"
    var rating_past = "week" + past + "_rating"
    // var query = [
    //     { $match: { $and: [{ averageRating: { $lte: "7" } }, { [rating_past]: { $exists: false } }, { [rating_present]: { $exists: true } }] } },
    // ]
    Merge.find({ $and: [{ [rating_past]: { $exists: false } }, { [rating_present]: { $exists: true } }] }, async (err, data) => {
        if (err) {
            res.send({ status: 0, data: [], message: err.stack })
        } else {
            if (data.length > 0) {
                // res.send({ status: 1, data: merge })
                data.forEach(element => {
                    tConstArr.push({ tconst: element.tconst, language: element.language, region: element.region })
                });
                var lang_arr = await Language.find({}, { __v: 0, _id: 0 })
                var coun_arr = await Country.find({}, { __v: 0, _id: 0 })
                k = 0
                loopArray()
                function loopArray() {
                    if (k < tConstArr.length) {
                        bringData(() => {
                            k++;
                            loopArray()
                        })
                    } else {
                        res.send({ status: 1, data, count: data.length })
                    }
                }
                function bringData(callback) {
                    var arr_L = []
                    var arr_R = []
                    var arr_R_final = []
                    var arr_L_final = []
                    var L = tConstArr[k].language
                    var R = tConstArr[k].region
                    L.forEach(element => {
                        element == "" ? null : arr_L.push(element)
                    });
                    R.forEach(element => {
                        element == "" ? null : arr_R.push(element)
                    });
                    // *******
                    for (let i = 0; i < arr_L.length; i++) {
                        lang_arr.find(element => element.code == arr_L[i] ? arr_L_final.push(element.name) : null)
                    }
                    for (let i = 0; i < arr_R.length; i++) {
                        coun_arr.find(element => element.code == arr_R[i] ? arr_R_final.push(element.name) : null)
                    }
                    data[k].language = arr_L_final.join(", ")
                    data[k].region = arr_R_final.join(", ")
                    callback()
                    return;
                    // *******
                    // ja,en,mk,fr,bg
                    Country.find({ code: { $in: arr_R } }, (err, coun) => {
                        // console.log("coun", coun);
                        coun.forEach(element => {
                            arr_R_final.push(element.name)
                        });
                        Language.find({ code: { $in: arr_L } }, (err, lang) => {
                            // console.log("lang", lang);
                            lang.forEach(element => {
                                arr_L_final.push(element.name)
                            });
                            data[k].language = arr_L_final.join(", ")
                            data[k].region = arr_R_final.join(", ")
                            callback()
                        })
                    })
                }
            } else {
                res.send({ status: 1, data: [] })
            }
        }

    })
    return;
    Above_6.find({}, (err, data) => {
        if (err) {
            res.send({ status: 0, message: "Failed to get data" })
        }
        if (data) {
            res.send({ status: 1, data: data })
        } else {
            res.send({ status: 1, data: [] })
        }
    })
    return false;
    if ((cron_table.above_6_start == 0 && cron_table.above_6_end == 0) && (cron_table.above_6_start == 1 && cron_table.above_6_end == 0)) {
        if (cron_table.above_6_start == 0) {
            var update_query = { above_6_start: 1, above_6_start_datetime: new Date() }
            var update_cron = await Cron_table.updateOne(cron_query, update_query)
        } else {
            if (cron_table.week_number == 1) {
                var update_query = { above_6: 0, above_6_end: 1, above_6_end_datetime: new Date() }
                var update_cron = await Cron_table.updateOne(cron_query, update_query)
            } else {
                var present = cron_table.week_number
                var past = Number(cron_table.week_number) - 1

                var rating_present = "week" + present + "_rating"
                var rating_past = "week" + past + "_rating"

                // ****
                var titleIDs = []
                var ratings = []
                var votes = []
                var above_6 = 0

                var allMerges = await Merge.find({})

                allMerges.forEach(element => {
                    titleIDs.push(element.tconst)
                    votes.push(element.numVotes)
                    ratings.push(element.averageRating)
                });

                k = 0;
                loopArray()
                async function loopArray() {
                    if (k < titleIDs.length) {
                        bringData(() => {
                            k++;
                            loopArray()
                        })
                    } else {
                        var update_query = { above_6, above_6_end: 1, above_6_end_datetime: new Date() }
                        var update_cron = await Cron_table.updateOne(cron_query, update_query)
                    }
                }
                async function bringData(callback) {
                    Merge.findOne({ tconst: titleIDs[k] }, async (err, merge) => {
                        console.log(titleIDs[k], k, titleIDs.length);

                        var present = merge[rating_present]
                        var past = merge[rating_past]

                        if (past < 6 && present > 6) {
                            above_6++;
                            var create_merge = await Above_6.create(merge)
                        }
                        callback()
                    })
                }
                // ****

            }
        }
    }
})

module.exports = router