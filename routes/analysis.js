const express = require("express");
const moment = require("moment");
const router = express.Router();
const Country = require("../models/country_schema");
const Language = require("../models/language_schema");
const Merge = require("../models/merge_schema");
const Title = require("../models/title_schema");


router.post("/list", async (req, res) => {
    console.log("req.body", req.body);
    var find_query = {}
    var query_arr = []
    var sort_obj = { primaryTitle: 1 }
    var tConstArr = []
    if (req.body.startYear && req.body.startYearOperator) {
        query_arr.push({ startYear: { [req.body.startYearOperator]: req.body.startYear.toString() } })
    }
    if (req.body.averageRating && req.body.averageRatingOperator) {
        query_arr.push({ averageRating: { [req.body.averageRatingOperator]: req.body.averageRating.toString() } })
    } else {
        query_arr.push({ averageRating: { $gte: 6 } })
    }
    if (req.body.numVotes && req.body.numVotesOperator) {
        query_arr.push({ numVotes: { [req.body.numVotesOperator]: req.body.numVotes.toString() } })
    }
    console.log("query_arr =====> ", JSON.stringify(query_arr));
    if (req.body.series_type) {
        query_arr.push({ titleType: { $eq: req.body.series_type } })
    }
    if (req.body.language) {
        var language_query_arr = []
        req.body.language.forEach(element => {
            language_query_arr.push({ main_language: { $eq: element } })
        });

        var language_query = { $or: language_query_arr }
        query_arr.push(language_query)
    }
    if (req.body.region) {
        var region_query_arr = []
        req.body.region.forEach(element => {
            region_query_arr.push({ main_country: { $eq: element } })
            console.log("query-before", region_query_arr, JSON.stringify(region_query_arr));
        });
        console.log("query-after", region_query_arr, JSON.stringify(region_query_arr));
        var region_query = { $or: region_query_arr }
        query_arr.push(region_query)

    }
    if (req.body.genres) {
        var genre_query_arr = []
        if (req.body.genres != "all") {
            req.body.genres.forEach(element => {
                genre_query_arr.push({ genres: new RegExp(element) })
            });
        }
        var genre_query = { $or: genre_query_arr }
        query_arr.push(genre_query)
    }
    if (req.body.title) {
        query_arr.push({ $or: [{ primaryTitle: new RegExp(req.body.title, 'i') }, { tconst: new RegExp(req.body.title, 'i') }] })
        console.log("query_arr", query_arr, JSON.stringify(query_arr));
        // query_arr.push({ primaryTitle: new RegExp(req.body.title, 'i') })
    }
    if (query_arr.length > 0) {
        find_query = { $and: query_arr }
    }
    console.log("find_query ==========> ", JSON.stringify(find_query));

    var limit = Number(req.body.limit) // limit
    var offset = Number(req.body.offset) // offset
    if (req.body.limit || req.body.offset) {
        var count = await Merge.countDocuments(find_query)
        var data = await Merge.find(find_query, { __v: 0, _id: 0 }).skip(offset).limit(limit);

        res.send({ status: 1, data, count })
    } else {
        Merge.find(find_query, { __v: 0, _id: 0 }, (err, data) => {
            res.send({ 'status': 1, data })
        }).sort(sort_obj).collation({ locale: "en", numericOrdering: true });
    }
})

router.post("/get-data-for-excel-download", async (req, res) => {
    console.log("req.body", req.body);
    var find_query = {}
    var query_arr = []
    var sort_obj = { primaryTitle: 1 }

    if (req.body.startYear && req.body.startYearOperator) {
        query_arr.push({ startYear: { [req.body.startYearOperator]: req.body.startYear.toString() } })
    }
    if (req.body.averageRating && req.body.averageRatingOperator) {
        query_arr.push({ averageRating: { [req.body.averageRatingOperator]: req.body.averageRating.toString() } })
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
                genre_query_arr.push({ genres: new RegExp(element) })
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
    if (req.body.sort_rating) {
        if (req.body.sort_rating == "from_6_to_10") {
            sort_obj.averageRating = 1
        } else if (req.body.sort_rating == "from_10_to_6") {
            sort_obj.averageRating = -1
        }
    }
    if (req.body.sort_votes) {
        if (req.body.sort_votes == "from_low_to_high") {
            sort_obj.numVotes = 1
        } else if (req.body.sort_votes == "from_high_to_low") {
            sort_obj.numVotes = -1
        }
    }
    if (req.body.sort_year) {
        if (req.body.sort_year == "from_2015_to_now") {
            sort_obj.startYear = 1
        } else if (req.body.sort_year == "from_now_to_2015") {
            sort_obj.startYear = -1
        }
    }
    var data_without = await Merge.find(find_query, { __v: 0, _id: 0 }).sort(sort_obj);
    // var data_without = []
    res.send({ 'status': 1, data_without })
})

router.get("/get-columns", (req, res) => {
    var key_value_number = 1
    var votes_columns = []
    var rating_columns = []

    var votes_columns_three = []
    var rating_columns_three = []

    Merge.findOne({}, async (err, merge) => {
        for (var i = 50; i > 0; i--) {
            var key = "week" + i
            if (merge[key] != null) {
                key_value_number = i;
                break;
            }
        }
        k = key_value_number;
        loopArray()
        function loopArray() {
            if (k > 0) {
                bringData(() => {
                    k--;
                    loopArray()
                })
            } else {
                var result = {}
                result.status = 1
                result.columns_detailed_view = { rating_columns, votes_columns }
                // console.log("result.columns_detailed_view-before", result.columns_detailed_view);
                if (key_value_number > 3) {
                    // var new_votes_columns = votes_columns
                    // var new_rating_columns = rating_columns
                    // new_votes_columns.splice(3, new_votes_columns.length)
                    // new_rating_columns.splice(3, new_rating_columns.length)
                    result.columns_three_week_view = { rating_columns: rating_columns_three, votes_columns: votes_columns_three }
                } else {
                    result.columns_three_week_view = { rating_columns, votes_columns }
                }
                // console.log("result.columns_detailed_view-after", result.columns_detailed_view);
                res.send(result)
            }
        }
        function bringData(callback) {
            if (merge['week' + k + '_rating'] && merge['week' + k + '_votes']) {
                var week_name = "week" + k
                var title = moment(merge[week_name]).format("MMM D")
                rating_columns.push({ title: title + ' Rating', dataIndex: 'week' + k + '_rating', key: 'week' + k + '_rating', width: 120 })
                votes_columns.push({ title: title + ' Vote', dataIndex: 'week' + k + '_votes', key: 'week' + k + '_votes', width: 120 })
                if (rating_columns_three.length < 3) {
                    rating_columns_three.push({ title: title + ' Rating', dataIndex: 'week' + k + '_rating', key: 'week' + k + '_rating', width: 120 })
                    votes_columns_three.push({ title: title + ' Vote', dataIndex: 'week' + k + '_votes', key: 'week' + k + '_votes', width: 120 })
                }
            }
            callback()
        }
    })
})

router.get("/get-genres", (req, res) => {
    var g = ""
    Merge.find({}, (err, merge) => {
        merge.forEach(element => {
            g += element.genres + ","
        });
        var myArray = g.split(',')

        let unique = [...new Set(myArray)];

        res.send({ 'data': unique })
    })
})

router.post("/new-development-projects", async (req, res) => {
    console.log("new-development-projects-body", req.body);

    var tConstArr = []
    var query = [
        {
            $match: {
                $and: [{ startYear: { $gte: "2022" } },
                { $or: [{ "titleType": "tvMiniSeries" }, { "titleType": "tvSeries" }] }]
            }
        }, {
            $lookup: { from: 'akas', localField: "tconst", foreignField: "titleId", as: "region" }
        }, {
            $lookup: { from: 'akas', localField: "tconst", foreignField: "titleId", as: "language" }
        }, {
            $project: { startYear: 1, tconst: 1, titleType: 1, numVotes: "$rate.numVotes", genres: 1, region: "$region.region", primaryTitle: 1, language: "$language.language" }
        },
        { $skip: Number(req.body.offset) },
        { $limit: Number(req.body.limit) }
    ]
    // if (req.body.offset && req.body.limit) {
    //     query.push({ $skip: Number(req.body.offset) })
    //     query.push({ $limit: Number(req.body.limit) })
    // }
    console.log("query", query);
    Title.aggregate(query, async (err, data) => {
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
                var queryForCount = [
                    {
                        $match: {
                            $and: [{ startYear: { $gte: "2022" } },
                            { $or: [{ "titleType": "tvMiniSeries" }, { "titleType": "tvSeries" }] }]
                        }
                    }, { $count: "count" }
                ]
                Title.aggregate(queryForCount, (err, count) => {
                    console.log("count", count);
                    console.log("count", count[0].count);
                    res.send({ status: 1, data, count: count[0].count })
                })
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
                if (coun.length > 0) {
                    coun.forEach(element => {
                        arr_R_final.push(element.name)
                    })
                    data[k].region = arr_R_final.join(", ")
                } else {
                    data[k].region = []
                }
                Language.find({ code: { $in: arr_L } }, (err, lang) => {
                    // console.log("lang", lang);
                    if (lang.length > 0) {
                        lang.forEach(element => {
                            arr_L_final.push(element.name)
                        });
                        data[k].language = arr_L_final.join(", ")
                    } else {
                        data[k].language = []
                    }
                    callback()
                })
            })
        }
    })
})

module.exports = router;