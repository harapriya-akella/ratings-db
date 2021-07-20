const express = require("express");
const router = express.Router();
var shell = require("shelljs");
var fs = require("fs");
const { spawn } = require('child_process');
var Rating = require("../models/rating_schema");
const Title = require("../models/title_schema");
const AKAS = require("../models/akas_schema");
const Merge = require("../models/merge_schema");
const zlib = require('zlib');
const Cron_table = require("../models/cron_table_schema");
var http = require("https")
const config = require("config")
var filepath = config.get("path").filepath
var moment = require("moment");
const Country = require("../models/country_schema");
const Language = require("../models/language_schema");
const Setting = require("../models/settings_schema");
const Margin_of_1 = require("../models/margin_of_1_schema")
const Above_500_votes = require("../models/above_500_votes_schema");
const UnderProduction = require("../models/underproduction")
var cron = require('node-cron');

// create_cron_table
cron.schedule('55 14 * * 2', async () => {
    var new_get_settings_data = 1
    var date = new Date
    var todays_date = date.getDate() + "-" + Number(date.getMonth() + 1) + "-" + date.getFullYear()
    var allCronTables = await Cron_table.find({ operation_date: todays_date })
    var query = {
        operation_date: todays_date,
        limit: 10000,
        offset: 0,
        created_on: new Date(),

        is_delete_akas_start: 0,
        is_delete_akas_end: 0,
        is_download_unzip_akas_start: 0,
        is_download_unzip_akas_end: 0,
        is_dumping_akas_start: 0,
        is_dumping_akas_end: 0,

        is_delete_title_start: 0,
        is_delete_title_end: 0,
        is_download_unzip_title_start: 0,
        is_download_unzip_title_end: 0,
        is_dumping_title_start: 0,
        is_dumping_title_end: 0,

        is_delete_rating_start: 0,
        is_delete_rating_end: 0,
        is_download_unzip_rating_start: 0,
        is_download_unzip_rating_end: 0,
        is_dumping_rating_start: 0,
        is_dumping_rating_end: 0,

        is_merging_start: 0,
        is_merging_end: 0,
        total_data_this_week: 0,

        is_delete_margin_of_1_start: 0,
        is_delete_margin_of_1_end: 0,
        margin_of_1: 0,
        margin_of_1_start: 0,
        margin_of_1_end: 0,
        margin_of_1_limit: 10000,
        margin_of_1_offset: 0,

        is_delete_above_500_votes_start: 0,
        is_delete_above_500_votes_end: 0,
        above_500_votes: 0,
        above_500_votes_start: 0,
        above_500_votes_end: 0,
        above_500_votes_limit: 10000,
        above_500_votes_offset: 0,

        is_delete_under_production_start: 0,
        is_delete_under_production_end: 0,
        under_production: 0,

        main_language_limit: 1000,
        main_country_limit: 1000,

        is_mail_sent: 0,
    }
    if (allCronTables <= 0) {
        var get_settings_data = await Setting.findOne({})
        if (get_settings_data.is_process_complete == 1) {
            var cron = await Cron_table.create(query)
            if (get_settings_data) { new_get_settings_data = Number(get_settings_data.week_number) + 1 }
            var setting_update = await Setting.updateOne({}, { this_week_folder_name: todays_date, week_number: new_get_settings_data, is_process_complete: 0 })
        }
        console.log("DONE-CREATE-CRON")
        // res.send({ 'status': 1 })
    }
})
// unzip_akas
cron.schedule('56 14 * * 2', async () => {
    var setting = await Setting.findOne({})
    var operation_date = setting.this_week_folder_name
    var cron_query = { operation_date }
    var full_date = operation_date.replace(/-/g, "_");

    Cron_table.findOne(cron_query, async (err, cron) => {
        // continue downloading from website
        if (cron.is_download_unzip_akas_start == 1 && cron.is_download_unzip_akas_end == 0 || cron.is_download_unzip_akas_start == 0 && cron.is_download_unzip_akas_end == 0) {
            if (cron.is_download_unzip_akas_start == 0) {
                var update_query = { is_download_unzip_akas_start: 1, is_download_unzip_akas_start_datetime: new Date() }
                var update_cron = await Cron_table.updateOne(cron_query, update_query)
            }
            download_upzip()
        }
        async function download_upzip() {
            var url = "https://datasets.imdbws.com/"
            var finalData = []
            var allPaths = []
            var tsvPaths = []
            const request = require('request');
            request(url, function (error, response, body) {
                var data = body.split("<ul>")
                // console.log(data);
                function manipulate(str) {
                    return str.split("href").pop().split(">").shift().split("=")[1]
                }
                for (let i = 1; i < 8; i++) {
                    finalData.push(manipulate(data[i]))
                }
                var fileUrl = finalData[1];
                var output = fileUrl.split("/").pop();
                const url = fileUrl
                var date = new Date()
                // var full_date = date.getDate() + '_' + Number(date.getMonth() + 1) + '_' + date.getFullYear()
                var insert_path = filepath + full_date + '/'

                if (!fs.existsSync(insert_path)) {
                    console.log("excel_file not exist");
                    shell.mkdir("-p", insert_path);
                }
                var path = insert_path + output
                var file = fs.createWriteStream(path, "utf8");
                var request = http.get(url).on('response', function (res) {
                    console.log('in cb');
                    res.on('data', function (chunk) {
                        file.write(chunk);
                        //console.log(chunk);
                    }).on('end', async function () {
                        console.log("chunk-end");
                        var target_path = path.slice(0, -3)
                        const fileContents = fs.createReadStream(`${path}`)
                        const writeStream = fs.createWriteStream(`${target_path}`)
                        const unzip = zlib.createGunzip()
                        fileContents.pipe(unzip).pipe(writeStream)
                        console.log("unzip-ended");
                        var update_query = { is_download_unzip_akas_end: 1, is_download_unzip_akas_end_datetime: new Date() }
                        var update_cron = await Cron_table.updateOne(cron_query, update_query)
                    }).on('error', function (err) {
                        // clear timeout
                        console.log(err.message);
                    });
                });
            })
        }
    })
})
// unzip_title
cron.schedule('56 14 * * 2', async () => {
    var setting = await Setting.findOne({})
    var operation_date = setting.this_week_folder_name
    var cron_query = { operation_date }
    var full_date = operation_date.replace(/-/g, "_");

    Cron_table.findOne(cron_query, async (err, cron) => {
        // continue downloading from website
        if (cron.is_download_unzip_title_start == 1 && cron.is_download_unzip_title_end == 0 || cron.is_download_unzip_title_start == 0 && cron.is_download_unzip_title_end == 0) {
            if (cron.is_download_unzip_title_start == 0) {
                var update_query = { is_download_unzip_title_start: 1, is_download_unzip_title_start_datetime: new Date() }
                var update_cron = await Cron_table.updateOne(cron_query, update_query)
            }
            download_upzip()
        }
        async function download_upzip() {
            var url = "https://datasets.imdbws.com/"
            var finalData = []
            var allPaths = []
            var tsvPaths = []
            const request = require('request');
            request(url, function (error, response, body) {
                var data = body.split("<ul>")
                // console.log(data);
                function manipulate(str) {
                    return str.split("href").pop().split(">").shift().split("=")[1]
                }
                for (let i = 1; i < 8; i++) {
                    finalData.push(manipulate(data[i]))
                }
                var fileUrl = finalData[2];
                var output = fileUrl.split("/").pop();
                const url = fileUrl
                var date = new Date()
                // var full_date = date.getDate() + '_' + Number(date.getMonth() + 1) + '_' + date.getFullYear()
                var insert_path = filepath + full_date + '/'

                if (!fs.existsSync(insert_path)) {
                    console.log("excel_file not exist");
                    shell.mkdir("-p", insert_path);
                }
                var path = insert_path + output
                var file = fs.createWriteStream(path, "utf8");
                var request = http.get(url).on('response', function (res) {
                    console.log('in cb');
                    res.on('data', function (chunk) {
                        file.write(chunk);
                        //console.log(chunk);
                    }).on('end', async function () {
                        console.log("chunk-end");
                        var target_path = path.slice(0, -3)
                        const fileContents = fs.createReadStream(`${path}`)
                        const writeStream = fs.createWriteStream(`${target_path}`)
                        const unzip = zlib.createGunzip()
                        fileContents.pipe(unzip).pipe(writeStream)
                        console.log("unzip-ended");
                        var update_query = { is_download_unzip_title_end: 1, is_download_unzip_title_end_datetime: new Date() }
                        var update_cron = await Cron_table.updateOne(cron_query, update_query)
                    }).on('error', function (err) {
                        // clear timeout
                        console.log(err.message);
                    });
                });
            })
        }
    })
})
// unzip_rating
cron.schedule('56 14 * * 2', async () => {
    var setting = await Setting.findOne({})
    var operation_date = setting.this_week_folder_name
    var cron_query = { operation_date }
    var full_date = operation_date.replace(/-/g, "_");

    Cron_table.findOne(cron_query, async (err, cron) => {
        // continue downloading from website
        if (cron.is_download_unzip_rating_start == 1 && cron.is_download_unzip_rating_end == 0 || cron.is_download_unzip_rating_start == 0 && cron.is_download_unzip_rating_end == 0) {
            if (cron.is_download_unzip_rating_start == 0) {
                var update_query = { is_download_unzip_rating_start: 1, is_download_unzip_rating_start_datetime: new Date() }
                var update_cron = await Cron_table.updateOne(cron_query, update_query)
            }
            download_upzip()
        }
        async function download_upzip() {
            var url = "https://datasets.imdbws.com/"
            var finalData = []
            var allPaths = []
            var tsvPaths = []
            const request = require('request');
            request(url, function (error, response, body) {
                var data = body.split("<ul>")
                // console.log(data);
                function manipulate(str) {
                    return str.split("href").pop().split(">").shift().split("=")[1]
                }
                for (let i = 1; i < 8; i++) {
                    finalData.push(manipulate(data[i]))
                }
                var fileUrl = finalData[6];
                var output = fileUrl.split("/").pop();
                const url = fileUrl
                var date = new Date()
                var insert_path = filepath + full_date + '/'

                if (!fs.existsSync(insert_path)) {
                    console.log("excel_file not exist");
                    shell.mkdir("-p", insert_path);
                }
                var path = insert_path + output
                var file = fs.createWriteStream(path, "utf8");
                var request = http.get(url).on('response', function (res) {
                    console.log('in cb');
                    res.on('data', function (chunk) {
                        file.write(chunk);
                        //console.log(chunk);
                    }).on('end', async function () {
                        console.log("chunk-end");
                        var target_path = path.slice(0, -3)
                        const fileContents = fs.createReadStream(`${path}`)
                        const writeStream = fs.createWriteStream(`${target_path}`)
                        const unzip = zlib.createGunzip()
                        fileContents.pipe(unzip).pipe(writeStream)
                        console.log("unzip-ended");
                        var update_query = { is_download_unzip_rating_end: 1, is_download_unzip_rating_end_datetime: new Date() }
                        var update_cron = await Cron_table.updateOne(cron_query, update_query)
                    }).on('error', function (err) {
                        // clear timeout
                        console.log(err.message);
                    });
                });
            })
        }
    })
})
// delete_akas
cron.schedule('0 15 * * 2', async () => {
    var settings = await Setting.findOne({})
    var operation_date = settings.this_week_folder_name
    var cron_query = { operation_date }
    var cron_search = await Cron_table.findOne(cron_query)
    if (!cron_search) {
        // res.send({ 'status': 1, 'message': 'CRON TABLE NOT FOUND' }) 
        console.log("CRON TABLE NOT FOUND", moment(new Date()).format("LTS"));
    }
    var akas_count = await AKAS.countDocuments({})
    console.log("akas_count", akas_count);
    if (akas_count > 0) {
        //continue deleting
        if ((cron_search.is_delete_akas_start == 0 && cron_search.is_delete_akas_end == 0) || (cron_search.is_delete_akas_start == 1 && cron_search.is_delete_akas_end == 0)) {
            if (cron_search.is_delete_akas_start == 0) {
                var update_cron_with = { is_delete_akas_start: 1, is_delete_akas_start_datetime: new Date() }
                var update_cron_table = await Cron_table.updateOne(cron_query, update_cron_with)
            }
            var delete_akas = await AKAS.deleteMany({})
            var akas_count = await AKAS.countDocuments({})
            if (akas_count <= 0) {
                var update_cron_with = {
                    is_delete_akas_end: 1,
                    is_delete_akas_end_datetime: new Date()
                }
                var update_cron_table = await Cron_table.updateOne(cron_query, update_cron_with)
            }
        }
    } else {
        var update_cron_with = {
            is_delete_akas_start: 1,
            is_delete_akas_start_datetime: new Date(),
            is_delete_akas_end: 1,
            is_delete_akas_end_datetime: new Date()
        }
        var update_cron_table = await Cron_table.updateOne(cron_query, update_cron_with)
    }
    // res.send({ 'status': 1 })
    console.log("DONE-DELETE-AKAS", moment(new Date()).format("LTS"))
})
// delete_title
cron.schedule('5 15 * * 2', async () => {
    var settings = await Setting.findOne({})
    var operation_date = settings.this_week_folder_name
    var cron_query = { operation_date }
    var cron_search = await Cron_table.findOne(cron_query)
    if (!cron_search) {
        // res.send({ 'status': 1, 'message': 'CRON TABLE NOT FOUND' }) 
        console.log("CRON TABLE NOT FOUND", moment(new Date()).format("LTS"))
    }
    var title_count = await Title.countDocuments({})
    if (title_count > 0) {
        //continue deleting
        if ((cron_search.is_delete_title_start == 0 && cron_search.is_delete_title_end == 0) || (cron_search.is_delete_title_start == 1 && cron_search.is_delete_title_end == 0)) {
            if (cron_search.is_delete_title_start == 0) {
                var update_cron_with = { is_delete_title_start: 1, is_delete_title_start_datetime: new Date() }
                var update_cron_table = await Cron_table.updateOne(cron_query, update_cron_with)
            }
            var delete_title = await Title.deleteMany({})
            var title_count = await Title.countDocuments({})
            if (title_count <= 0) {
                var update_cron_with = {
                    is_delete_title_end: 1,
                    is_delete_title_end_datetime: new Date()
                }
                var update_cron_table = await Cron_table.updateOne(cron_query, update_cron_with)
            }
        }
    } else {
        var update_cron_with = {
            is_delete_title_start: 1, is_delete_title_start_datetime: new Date(),
            is_delete_title_end: 1,
            is_delete_title_end_datetime: new Date()
        }
        var update_cron_table = await Cron_table.updateOne(cron_query, update_cron_with)
    }
    // res.send({ 'status': 1 })
    console.log("DELETE TITLE", moment(new Date()).format("LTS"))
})
// delete_rating
cron.schedule('10 15 * * 2', async () => {
    var settings = await Setting.findOne({})
    var operation_date = settings.this_week_folder_name
    var cron_query = { operation_date }
    var cron_search = await Cron_table.findOne(cron_query)
    if (!cron_search) {
        // res.send({ 'status': 1, 'message': 'CRON TABLE NOT FOUND' }) 
        console.log("CRON TABLE NOT FOUND", moment(new Date()).format("LTS"))
    }
    var rating_count = await Rating.countDocuments({})
    if (rating_count > 0) {
        //continue deleting
        if ((cron_search.is_delete_rating_start == 0 && cron_search.is_delete_rating_end == 0) || (cron_search.is_delete_rating_start == 1 && cron_search.is_delete_rating_end == 0)) {
            if (cron_search.is_delete_rating_start == 0) {
                var update_cron_with = { is_delete_rating_start: 1, is_delete_rating_start_datetime: new Date() }
                var update_cron_table = await Cron_table.updateOne(cron_query, update_cron_with)
            }
            var delete_rating = await Rating.deleteMany({})
            var rating_count = await Rating.countDocuments({})
            if (rating_count <= 0) {
                var update_cron_with = {
                    is_delete_rating_end: 1,
                    is_delete_rating_end_datetime: new Date()
                }
                var update_cron_table = await Cron_table.updateOne(cron_query, update_cron_with)
            }
        }
    } else {
        var update_cron_with = {
            is_delete_rating_start: 1, is_delete_rating_start_datetime: new Date(),
            is_delete_rating_end: 1,
            is_delete_rating_end_datetime: new Date()
        }
        var update_cron_table = await Cron_table.updateOne(cron_query, update_cron_with)
    }
    // res.send({ 'status': 1 })
    console.log("DELETE RATING", moment(new Date()).format("LTS"))
})
// dump_akas
cron.schedule('20 15 * * 2', async () => {
    var setting = await Setting.findOne({})
    var operation_date = setting.this_week_folder_name
    var cron_query = { operation_date }
    console.log("setting", setting);
    Cron_table.findOne(cron_query, async (err, cron) => {
        if (cron.is_download_unzip_akas_end == 1) {
            var full_date = operation_date.replace(/-/g, "_");
            var fromTSVPath = filepath + full_date + "/title.akas.tsv"

            var sedCommandtoRead = ['--db', 'imdb_3', '--collection', 'akas', '--type', 'tsv', fromTSVPath, '--headerline']

            Cron_table.updateOne(cron_query, { is_dumping_akas_start: 1, is_dumping_akas_start_datetime: new Date() }, (err, update_start) => {

                const ls = spawn('mongoimport', sedCommandtoRead)
                ls.stdout.on('data', (data) => {
                    console.log(`stdout: ${data}`);
                });

                ls.stderr.on('data', (data) => {
                    console.error(`stderr: ${data}`);
                });

                ls.on('close', (code) => {
                    console.log(`child process exited with code ${code}`);
                    Cron_table.updateOne(cron_query, { is_dumping_akas_end: 1, is_dumping_akas_end_datetime: new Date() }, (err, update_end) => {
                        // res.send({ 'status': 1, 'message': 'AKAS file read successfully' })
                        console.log("AKAS file read successfully", moment(new Date()).format("LTS"))
                    })
                });
            })
        } else {
            // res.send({ 'status': 1, 'message': 'Unzipping not finished yet' })
            console.log("Unzipping not finished yet", moment(new Date()).format("LTS"))
        }
    })
});
// dump_title
cron.schedule('30 15 * * 2', async () => {
    var setting = await Setting.findOne({})
    var operation_date = setting.this_week_folder_name
    var cron_query = { operation_date }
    Cron_table.findOne(cron_query, async (err, cron) => {
        if (cron.is_download_unzip_title_end == 1) {
            var full_date = operation_date.replace(/-/g, "_");
            var fromTSVPath = filepath + full_date + "/title.basics.tsv"
            var sedCommandtoRead = ['--db', 'imdb_3', '--collection', 'titles', '--type', 'tsv', fromTSVPath, '--headerline']

            Cron_table.updateOne(cron_query, { is_dumping_title_start: 1, is_dumping_title_start_datetime: new Date() }, (err, update_start) => {
                const ls = spawn('mongoimport', sedCommandtoRead)
                ls.stdout.on('data', (data) => {
                    console.log(`stdout: ${data}`);
                });

                ls.stderr.on('data', (data) => {
                    console.error(`stderr: ${data}`);
                });

                ls.on('close', (code) => {
                    console.log(`child process exited with code ${code}`);
                    Cron_table.updateOne(cron_query, { is_dumping_title_end: 1, is_dumping_title_end_datetime: new Date() }, (err, update_end) => {
                        // res.send({ 'status': 1, 'message': 'Title file read successfully' })
                        console.log("Title file read successfully", moment(new Date()).format("LTS"))

                    })
                });
            })
        } else {
            // res.send({ 'status': 1, 'message': 'Unzipping not finished yet' })
            console.log("Unzipping not finished yet", moment(new Date()).format("LTS"))
        }
    })
})
// dump_rating
cron.schedule('40 15 * * 2', async () => {
    var setting = await Setting.findOne({})
    var operation_date = setting.this_week_folder_name
    var cron_query = { operation_date }
    Cron_table.findOne(cron_query, async (err, cron) => {
        if (cron.is_download_unzip_rating_end == 1) {
            var full_date = operation_date.replace(/-/g, "_");
            var fromTSVPath = filepath + full_date + "/title.ratings.tsv"

            var sedCommandtoRead = ['--db', 'imdb_3', '--collection', 'ratings', '--type', 'tsv', fromTSVPath, '--headerline']

            Cron_table.updateOne(cron_query, { is_dumping_rating_start: 1, is_dumping_rating_start_datetime: new Date() }, (err, update_start) => {
                const ls = spawn('mongoimport', sedCommandtoRead)
                ls.stdout.on('data', (data) => {
                    console.log(`stdout: ${data}`);
                });

                ls.stderr.on('data', (data) => {
                    console.error(`stderr: ${data}`);
                });

                ls.on('close', (code) => {
                    console.log(`child process exited with code ${code}`);
                    Cron_table.updateOne(cron_query, { is_dumping_rating_end: 1, is_dumping_rating_end_datetime: new Date() }, (err, update_end) => {
                        // res.send({ 'status': 1, 'message': 'Rating file read successfully' })
                        console.log("Rating file read successfully", moment(new Date()).format("LTS"))
                    })
                });
            })
        } else {
            console.log("Unzipping not finished yet", moment(new Date()).format("LTS"))
        }
    })
})
// merge
cron.schedule('*/15 16 * * 2', async () => {
    console.log("START-MERGING", moment(new Date()).format("LTS"))
    var merge_data = []
    var votes = []
    var ratings = []
    var titleID = []
    var setting = await Setting.findOne({})
    var operation_date = setting.this_week_folder_name
    var cron_query = { operation_date }
    var cron_table = await Cron_table.findOne(cron_query)
    var limit = cron_table.limit
    var offset = cron_table.offset
    var present_week_number = setting.week_number
    if (cron_table.is_dumping_rating_end == 1 && cron_table.is_dumping_akas_end == 1 && cron_table.is_dumping_title_end == 1) {
        if ((cron_table.is_merging_start == 1 && cron_table.is_merging_end == 0) || (cron_table.is_merging_start == 0 && cron_table.is_merging_end == 0)) {
            if (cron_table.is_merging_start == 0) {
                var update_query = { is_merging_start: 1, is_merging_start_datetime: new Date() }
                var update_cron = await Cron_table.updateOne(cron_query, update_query)
            }
            console.log('start merge', offset, limit);
            console.log("start", moment(new Date()).format("LLLL"));

            merge()
        }
    }
    async function merge() {
        var query = [
            {
                $match: {
                    $and: [{ startYear: { $gte: 2015 } }, { startYear: { $ne: "\\N" } },
                    { $or: [{ "titleType": "tvMiniSeries" }, { "titleType": "tvSeries" }] }]
                }
            },
            { $lookup: { from: 'ratings', localField: "tconst", foreignField: "tconst", as: "rate" } },
            { $lookup: { from: 'akas', localField: "tconst", foreignField: "titleId", as: "region" } },
            { $lookup: { from: 'akas', localField: "tconst", foreignField: "titleId", as: "title" } },
            { $lookup: { from: 'akas', localField: "tconst", foreignField: "titleId", as: "language" } },
            { $project: { startYear: 1, tconst: 1, titleType: 1, averageRating: "$rate.averageRating", numVotes: "$rate.numVotes", genres: 1, region: "$region.region", primaryTitle: 1, originalTitle: 1, language: "$language.language", alternateTitle: "$title.title" } },
            { $match: { $and: [{ averageRating: { $gte: 6 } }] } },
            { $skip: offset },
            { $limit: limit },
        ]
        // alternateTitle
        // console.log("query", query);
        Title.aggregate(query, async (err, data) => {
            if (cron_table.total_data_this_week == 0) {
                var query = [
                    {
                        $match: {
                            $and: [{ startYear: { $gte: 2015 } }, { startYear: { $ne: "\\N" } },
                            { $or: [{ "titleType": "tvMiniSeries" }, { "titleType": "tvSeries" }] }]
                        }
                    }, {
                        $lookup: { from: 'ratings', localField: "tconst", foreignField: "tconst", as: "rate" }
                    }, {
                        $lookup: { from: 'akas', localField: "tconst", foreignField: "titleId", as: "region" }
                    }, {
                        $lookup: { from: 'akas', localField: "tconst", foreignField: "titleId", as: "language" }
                    }, {
                        $lookup: { from: 'akas', localField: "tconst", foreignField: "titleId", as: "title" }
                    }, {
                        $project: { startYear: 1, tconst: 1, titleType: 1, averageRating: "$rate.averageRating", numVotes: "$rate.numVotes", genres: 1, region: "$region.region", primaryTitle: 1, originalTitle: 1, language: "$language.language", alternateTitle: "$title.title" }
                    },
                    { $match: { $and: [{ averageRating: { $gte: 6 } }] } },
                ]
                var countMerges = await Title.aggregate(query)
                console.log('countMerges.length', countMerges.length);
                var update_cron_query = { total_data_this_week: countMerges.length }
                var update_cron = await Cron_table.updateOne(cron_query, update_cron_query)
            }
            console.log('merge data length', data.length);
            console.log('offset', offset);
            console.log('cron_table.total_data_this_week', cron_table.total_data_this_week);
            if (data.length > 0) {
                // above_6 = data.length
                data.forEach(element => {
                    titleID.push(element.tconst)
                    ratings.push(element.averageRating[0])
                    votes.push(element.numVotes[0])
                });
                k = 0;
                loopArray()
                async function loopArray() {
                    if (k < data.length) {
                        bringData(() => {
                            k++;
                            loopArray()
                        })
                    } else {
                        console.log('merge if condition');
                        console.log('merge_data.length > 0', (merge_data.length > 0));
                        if (merge_data.length > 0) {
                            var merge_create = await Merge.insertMany(merge_data)
                        }
                        console.log('offset > cron_table.total_data_this_week', (offset > cron_table.total_data_this_week));

                        if (offset > cron_table.total_data_this_week) {
                            //end
                            console.log('update data after total length done');
                            var update_query = { is_merging_end: 1, is_merging_end_datetime: new Date() }
                            var update_cron = await Cron_table.updateOne(cron_query, update_query)
                            // *******
                            var update_setting = await Setting.updateOne({ _id: setting._id }, { cron_id: cron_table._id })
                            console.log('setting update', update_setting);
                            // *******

                        } else {
                            var newOffset = Number(offset) + 10000
                            var update_cron = await Cron_table.updateOne(cron_query, { offset: newOffset })
                        }
                        // res.send({ status: 1, message: 'Done merging' })
                        console.log("Done merging", moment(new Date()).format("LTS"))
                    }
                }
                async function bringData(callback) {
                    var numVotes = []
                    var averageRating = []
                    var updateMerge = await Merge.updateOne({ tconst: titleID[k] }, { averageRating: [''], numVotes: [''] })
                    Merge.findOne({ tconst: titleID[k] }, async (err, merge) => {

                        var rating_week_name = "week" + present_week_number + "_rating"
                        var votes_week_name = "week" + present_week_number + "_votes"
                        var week_name = "week" + present_week_number
                        if (merge) {
                            averageRating.push(ratings[k])
                            numVotes.push(votes[k])
                            var d = new Date();
                            var data_to_update = {
                                [rating_week_name]: ratings[k], [votes_week_name]: votes[k], averageRating, numVotes, [week_name]: new Date()
                            }
                            var update_merge = await Merge.updateOne({ tconst: titleID[k] }, data_to_update)
                        } else {
                            data[k][rating_week_name] = ratings[k]
                            data[k][votes_week_name] = votes[k]
                            data[k][week_name] = new Date()

                            merge_data.push(data[k])
                        }
                        console.log("k", k);
                        callback()
                        // ****************
                    })
                }
            } else {
                if (cron_table.is_merging_end == 0 || !cron_table.is_merging_end || cron_table.is_merging_end == "" || cron_table.is_merging_end == "0") {
                    Cron_table.updateOne(cron_query, { is_merging_end: 1, is_merging_end_datetime: new Date() }, (err, up_cron) => {
                        console.log("Done merging", moment(new Date()).format("LTS"))
                    })
                    var update_setting = await Setting.updateOne({ _id: setting._id }, { cron_id: cron_table._id })
                    console.log('setting update data not found with offset', update_setting);
                } else {
                    console.log("Done merging", moment(new Date()).format("LTS"))
                }
            }
        })
    }
})
// get_data1
cron.schedule('40 16 * * 2', async () => {
    console.log("START", moment(new Date()).format("LTS"));
    // var page = 1
    // var limit = 960
    // var skip = Number(page - 1) * limit

    var setting = await Setting.findOne({})
    var operation_date = setting.this_week_folder_name
    var cron_query = { operation_date }

    var cron_table = await Cron_table.findOne(cron_query)

    var limit = cron_table.main_country_limit
    var skip = 0

    var merge = await Merge.find({ main_language: { $eq: "" } }, { tconst: 1 }).limit(limit).skip(skip) // 1012
    // console.log("merge", merge.length);
    k = 0
    loopArray()
    function loopArray() {
        if (k < merge.length) {
            bringData(() => {
                k++;
                loopArray()
            })
        } else {
            console.log("END", moment(new Date()).format("LTS"));
            console.log("***************DONE***************");
            // res.send({ status: 1 })
        }
    }
    function bringData(callback) {
        var tconst = merge[k].tconst
        var url = "https://www.imdb.com/title/" + tconst + "/"
        var final_c = []
        var final_l = []
        var arr_c = []
        var arr_l = []
        var main_country = ""
        var main_language = ""

        request({ url }, async function (err, response, body) {
            const $ = cheerio.load(body);
            const title = $("title").text()
            var hrefInThisLink = $("a")
            hrefInThisLink.map((i, element) => {
                var url = element.attribs.href
                if (url != null) {
                    if (url.search("country_of_origin") != -1) {
                        if (url.startsWith("/")) {
                            url = "https://www.imdb.com" + url
                        }
                        var get_url = new URL(url)
                        var c = get_url.searchParams.get("country_of_origin")
                        final_c.push(c.toUpperCase())
                    }
                    if (url.search("primary_language") != -1) {
                        if (url.startsWith("/")) {
                            url = "https://www.imdb.com" + url
                        }
                        var get_url = new URL(url)
                        var l = get_url.searchParams.get("primary_language")
                        final_l.push(l)
                    }
                }
            });
            var coun = await Country.find({ code: { $in: final_c } }, { name: 1 })
            var lang = await Language.find({ code: { $in: final_l } }, { name: 1 })
            lang.forEach(element => {
                arr_l.push(element.name)
            });
            coun.forEach(element => {
                arr_c.push(element.name)
            });
            main_country = arr_c.join().replace(/,/g, ", ")
            main_language = arr_l.join().replace(/,/g, ", ")

            var update_merge = await Merge.updateOne({ tconst }, { main_country, main_language })
            console.log(k, "/", limit, tconst, moment(new Date()).format("LTS"));
            callback()
        })
    }
})
// get_data2
cron.schedule('45 16 * * 2', async () => {
    var setting = await Setting.findOne({})
    var operation_date = setting.this_week_folder_name
    var cron_query = { operation_date }

    var cron_table = await Cron_table.findOne(cron_query)

    var limit = cron_table.main_country_limit
    var skip = 0

    console.log("START", moment(new Date()).format("LTS"));

    var merge = await Merge.find({ main_country: { $eq: "" } }, { tconst: 1 }).limit(limit).skip(skip) // 623

    k = 0
    loopArray()
    function loopArray() {
        if (k < merge.length) {
            bringData(() => {
                k++;
                loopArray()
            })
        } else {
            console.log("END", moment(new Date()).format("LTS"));
            console.log("***************DONE***************");
            // res.send({ status: 1 })
        }
    }
    function bringData(callback) {
        var tconst = merge[k].tconst
        var url = "https://www.imdb.com/title/" + tconst + "/"
        var final_c = []
        var final_l = []
        var arr_c = []
        var arr_l = []
        var main_country = ""
        var main_language = ""

        request({ url }, async function (err, response, body) {
            const $ = cheerio.load(body);
            const title = $("title").text()
            var hrefInThisLink = $("a")
            hrefInThisLink.map((i, element) => {
                var url = element.attribs.href
                if (url != null) {
                    if (url.search("country_of_origin") != -1) {
                        if (url.startsWith("/")) {
                            url = "https://www.imdb.com" + url
                        }
                        var get_url = new URL(url)
                        var c = get_url.searchParams.get("country_of_origin")
                        final_c.push(c.toUpperCase())
                    }
                    if (url.search("primary_language") != -1) {
                        if (url.startsWith("/")) {
                            url = "https://www.imdb.com" + url
                        }
                        var get_url = new URL(url)
                        var l = get_url.searchParams.get("primary_language")
                        final_l.push(l)
                    }
                }
            });
            var coun = await Country.find({ code: { $in: final_c } }, { name: 1 })
            var lang = await Language.find({ code: { $in: final_l } }, { name: 1 })
            lang.forEach(element => {
                arr_l.push(element.name)
            });
            coun.forEach(element => {
                arr_c.push(element.name)
            });
            main_country = arr_c.join().replace(/,/g, ", ")
            main_language = arr_l.join().replace(/,/g, ", ")

            var update_merge = await Merge.updateOne({ tconst }, { main_country, main_language })
            console.log(k, "/", limit, tconst, moment(new Date()).format("LTS"));
            callback()
        })
    }
})
// delete_margin_of_1
cron.schedule('55 16 * * 2', async () => {
    var settings = await Setting.findOne({})
    var operation_date = settings.this_week_folder_name
    var cron_query = { operation_date }
    var cron_search = await Cron_table.findOne(cron_query)
    if (!cron_search) {
        // res.send({ 'status': 1, 'message': 'CRON TABLE NOT FOUND' }) 
        console.log("CRON TABLE NOT FOUND", moment(new Date()).format("LTS"))
    }
    var margin_of_1_count = await Margin_of_1.countDocuments({})
    if (margin_of_1_count > 0) {
        //continue deleting
        if ((cron_search.is_delete_margin_of_1_start == 0 && cron_search.is_delete_margin_of_1_end == 0) || (cron_search.is_delete_margin_of_1_start == 1 && cron_search.is_delete_margin_of_1_end == 0)) {
            if (cron_search.is_delete_margin_of_1_start == 0) {
                var update_cron_with = { is_delete_margin_of_1_start: 1, is_delete_margin_of_1_start_datetime: new Date() }
                var update_cron_table = await Cron_table.updateOne(cron_query, update_cron_with)
            }
            var delete_margin_of_1 = await Margin_of_1.deleteMany({})
            if (margin_of_1_count <= 0) {
                var update_cron_with = {
                    is_delete_margin_of_1_end: 1,
                    is_delete_margin_of_1_end_datetime: new Date()
                }
                var update_cron_table = await Cron_table.updateOne(cron_query, update_cron_with)
            }
        }
    } else {
        var update_cron_with = {
            is_delete_margin_of_1_start: 1, is_delete_margin_of_1_start_datetime: new Date(),
            is_delete_margin_of_1_end: 1,
            is_delete_margin_of_1_end_datetime: new Date()
        }
        var update_cron_table = await Cron_table.updateOne(cron_query, update_cron_with)
    }
    // res.send({ 'status': 1 })
    console.log("DONE", moment(new Date()).format("LTS"))
})
// delete_above_500_votes
cron.schedule('55 16 * * 2', async () => {
    var settings = await Setting.findOne({})
    var operation_date = settings.this_week_folder_name
    var cron_query = { operation_date }
    var cron_search = await Cron_table.findOne(cron_query)
    if (!cron_search) {
        // res.send({ 'status': 1, 'message': 'CRON TABLE NOT FOUND' })
        console.log("CRON TABLE NOT FOUND", moment(new Date()).format("LTS"))
    }
    var above_500_votes_count = await Above_500_votes.countDocuments({})
    if (above_500_votes_count > 0) {
        //continue deleting
        if ((cron_search.is_delete_above_500_votes_start == 0 && cron_search.is_delete_above_500_votes_end == 0) || (cron_search.is_delete_above_500_votes_start == 1 && cron_search.is_delete_above_500_votes_end == 0)) {
            if (cron_search.is_delete_above_500_votes_start == 0) {
                var update_cron_with = { is_delete_above_500_votes_start: 1, is_delete_above_500_votes_start_datetime: new Date() }
                var update_cron_table = await Cron_table.updateOne(cron_query, update_cron_with)
            }
            var delete_above_500_votes = await Above_500_votes.deleteMany({})
            if (above_500_votes_count <= 0) {
                var update_cron_with = {
                    is_delete_above_500_votes_end: 1,
                    is_delete_above_500_votes_end_datetime: new Date()
                }
                var update_cron_table = await Cron_table.updateOne(cron_query, update_cron_with)
            }
        }
    } else {
        var update_cron_with = {
            is_delete_above_500_votes_start: 1, is_delete_above_500_votes_start_datetime: new Date(),
            is_delete_above_500_votes_end: 1,
            is_delete_above_500_votes_end_datetime: new Date()
        }
        var update_cron_table = await Cron_table.updateOne(cron_query, update_cron_with)
    }
    // res.send({ 'status': 1 })
    console.log("DONE", moment(new Date()).format("LTS"))
})
// delete_under_production
cron.schedule('55 16 * * 2', async () => {
    var settings = await Setting.findOne({})
    var operation_date = settings.this_week_folder_name
    var cron_query = { operation_date }
    var cron_search = await Cron_table.findOne(cron_query)
    if (!cron_search) {
        // res.send({ 'status': 1, 'message': 'CRON TABLE NOT FOUND' }) 
        console.log("CRON TABLE NOT FOUND", moment(new Date()).format("LTS"))
    }
    var under_production_count = await UnderProduction.countDocuments({})
    if (under_production_count > 0) {
        //continue deleting
        if ((cron_search.is_delete_under_production_start == 0 && cron_search.is_delete_under_production_end == 0) || (cron_search.is_delete_under_production_start == 1 && cron_search.is_delete_under_production_end == 0)) {
            if (cron_search.is_delete_under_production_start == 0) {
                var update_cron_with = { is_delete_under_production_start: 1, is_delete_under_production_start_datetime: new Date() }
                var update_cron_table = await Cron_table.updateOne(cron_query, update_cron_with)
            }
            var delete_under_production = await UnderProduction.deleteMany({})
            if (under_production_count <= 0) {
                var update_cron_with = {
                    is_delete_under_production_end: 1,
                    is_delete_under_production_end_datetime: new Date()
                }
                var update_cron_table = await Cron_table.updateOne(cron_query, update_cron_with)
            }
        }
    } else {
        var update_cron_with = {
            is_delete_under_production_start: 1, is_delete_under_production_start_datetime: new Date(),
            is_delete_under_production_end: 1,
            is_delete_under_production_end_datetime: new Date()
        }
        var update_cron_table = await Cron_table.updateOne(cron_query, update_cron_with)
    }
    // res.send({ 'status': 1 })
    console.log("DONE", moment(new Date()).format("LTS"))
})
// margin_of_1
cron.schedule('*/10 17 * * 2', async () => {
    var setting = await Setting.findOne({})
    var operation_date = setting.this_week_folder_name
    var cron_query = { operation_date }
    var cron_table = await Cron_table.findOne(cron_query)
    var limit = cron_table.margin_of_1_limit
    var skip = cron_table.margin_of_1_offset

    var total = cron_table.total_data_this_week

    if ((cron_table.margin_of_1_start == 0 && cron_table.margin_of_1_end == 0) || (cron_table.margin_of_1_start == 1 && cron_table.margin_of_1_end == 0)) {
        if (cron_table.margin_of_1_start == 0) {
            var update_query = { margin_of_1_start: 1, margin_of_1_start_datetime: new Date() }
            var update_cron = await Cron_table.updateOne(cron_query, update_query)
        }
        if (setting.week_number == 1) {
            var update_query = { margin_of_1: 0, margin_of_1_end: 1, margin_of_1_end_datetime: new Date() }
            var update_cron = await Cron_table.updateOne(cron_query, update_query)
            // res.send({ 'status': 1, 'message': 'Margin of 1 counting done' })
            console.log("Margin of 1 counting done", moment(new Date()).format("LTS"))
        } else {
            var present = setting.week_number
            var past = Number(setting.week_number) - 1

            var rating_present = "week" + present + "_rating"
            var rating_past = "week" + past + "_rating"

            // ****
            var titleIDs = []
            var ratings = []
            var votes = []
            var margin_of_1 = 0

            var allMerges = await Merge.find({}).limit(limit).skip(skip)
            // var allMerges = await Merge.find({})

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
                    console.log('finished margin_of_1', margin_of_1);
                    if (skip > total) {
                        //end
                        console.log('update data after total length done');
                        var merge_count = await Margin_of_1.countDocuments({})
                        var update_query = { margin_of_1: merge_count, margin_of_1_end: 1, margin_of_1_end_datetime: new Date() }
                        var update_cron = await Cron_table.updateOne(cron_query, update_query)
                    } else {
                        var newOffset = Number(skip) + limit
                        var update_cron = await Cron_table.updateOne(cron_query, { margin_of_1_offset: newOffset })
                    }
                    console.log("Margin of 1 counting done", moment(new Date()).format("LTS"))
                }
            }
            async function bringData(callback) {
                //console.log(titleIDs[k], k, titleIDs.length);
                Merge.findOne({ tconst: titleIDs[k] }, async (err, merge) => {
                    if (merge) {
                        var newMerge = merge.toObject();
                        var present = merge[rating_present]
                        var past = merge[rating_past]
                        delete newMerge._id;
                        delete newMerge.__v;
                        console.log('k, titleID lenghth, titleIDs[k],present, past, margin_of_1', k, titleIDs.length, titleIDs[k], present, past, margin_of_1);
                        if (Number(present - past) > 1) {
                            margin_of_1++;
                            console.log('merge', newMerge);
                            var margin_create = await Margin_of_1.create(newMerge)
                        }
                    }
                    callback();
                })
            }
            // ****

        }
    }
})
// above_500_votes
cron.schedule('*/10 17 * * 2', async () => {
    var setting = await Setting.findOne({})
    var operation_date = setting.this_week_folder_name
    var cron_query = { operation_date }
    var cron_table = await Cron_table.findOne(cron_query)

    var limit = cron_table.above_500_votes_limit
    var skip = cron_table.above_500_votes_offset

    var total = cron_table.total_data_this_week

    var present = setting.week_number
    if ((cron_table.above_500_votes_start == 0 && cron_table.above_500_votes_end == 0) || (cron_table.above_500_votes_start == 1 && cron_table.above_500_votes_end == 0)) {
        if (cron_table.above_500_votes_start == 0) {
            var update_query = { above_500_votes_start: 1, above_500_votes_start_datetime: new Date() }
            var update_cron = await Cron_table.updateOne(cron_query, update_query)
        }
        if (present == 1) {
            var update_query = { above_500_votes: 0, above_500_votes_end: 1, above_500_votes_end_datetime: new Date() }
            var update_cron = await Cron_table.updateOne(cron_query, update_query)
            // res.send({ 'status ': 1, 'message': 'Above 500 votes counting done' })
            console.log("Above 500 votes counting done", moment(new Date()).format("LTS"))
        } else {
            var past = Number(setting.week_number) - 1

            var votes_present = "week" + present + "_votes"
            var rating_present = "week" + present + "_rating"

            var votes_past = "week" + past + "_votes"

            var titleIDs = []
            var votes = []
            var above_500_votes = 0

            var allMerges = await Merge.find({ [rating_present]: { $gte: "6" } }).limit(limit).skip(skip)

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
                    if (skip > total) {
                        //end
                        console.log('update data after total length done');
                        var above_500_votes = await Above_500_votes.countDocuments({})
                        var update_query = { above_500_votes, above_500_votes_end: 1, above_500_votes_end_datetime: new Date() }
                        var update_cron = await Cron_table.updateOne(cron_query, update_query)
                    } else {
                        var newOffset = Number(skip) + limit
                        var update_cron = await Cron_table.updateOne(cron_query, { above_500_votes_offset: newOffset })
                    }
                    // res.send({ 'status ': 1, 'message': 'Avove 500 votes counting done' })
                    console.log("Above 500 votes counting done", moment(new Date()).format("LTS"))
                    // *******************
                }
            }
            async function bringData(callback) {
                Merge.findOne({ tconst: titleIDs[k] }, async (err, merge) => {
                    console.log("gererre", titleIDs[k]);
                    if (merge) {
                        var newMerge = merge.toObject();
                        var present = merge[votes_present]
                        var past = merge[votes_past]
                        if (!past) {
                        } else {
                            delete newMerge._id;
                            delete newMerge.__v;
                            var findID = await Above_500_votes.find({ tconst: titleIDs[k] })
                            if (Number(present - past) >= 500 && findID.length <= 0) {
                                console.log("newMerge", newMerge);
                                var create_merge = await Above_500_votes.create(newMerge)
                                above_500_votes++;
                            }
                        }
                    }
                    callback()
                })
            }
        }
    }
})
// add-development-projects
cron.schedule('0 17 * * 2', async () => {

    var setting = await Setting.findOne({})
    var operation_date = setting.this_week_folder_name
    var cron_query = { operation_date }

    var date = new Date()
    var year = Number(date.getFullYear() + 1) // next year
    var page = 1
    var limit = 500
    var skip = limit * Number(page - 1)
    var tConstArr = []
    var query = [
        {
            $match: {
                $and: [{ startYear: { $gte: year } }, { startYear: { $ne: "\\N" } },
                { $or: [{ "titleType": "tvMiniSeries" }, { "titleType": "tvSeries" }] }]
            }
        }, {
            $lookup: { from: 'akas', localField: "tconst", foreignField: "titleId", as: "akas" }
        }, {
            $project: { startYear: 1, tconst: 1, titleType: 1, genres: 1, region: "$akas.region", primaryTitle: 1, originalTitle: 1, language: "$akas.language" }
        },
        { $skip: skip },
        { $limit: limit }
    ]
    console.log("query", query);
    Title.aggregate(query, async (err, data) => {
        console.log("DATA-LENGTH", data.length);

        console.log("DATA", data);

        data.forEach(element => {
            tConstArr.push({ tconst: element.tconst, language: element.language, region: element.region })
        });
        var lang_arr = await Language.find({}, { __v: 0, _id: 0 })
        var coun_arr = await Country.find({}, { __v: 0, _id: 0 })
        k = 0
        loopArray()
        async function loopArray() {
            if (k < tConstArr.length) {
                bringData(() => {
                    k++;
                    loopArray()
                })
            } else {
                // res.send({ status: 1, data, count: data.length })
                console.log("DONE", moment(new Date()).format("LTS"))
                var under_production = await UnderProduction.countDocuments({})
                var un = { under_production }
                var update = await Cron_table.updateOne(cron_query, un)
            }
        }
        async function bringData(callback) {
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
            delete data[k]._id;
            var create_underproduction = await UnderProduction.create(data[k])
            callback()
        }
    })
})
// send_email
cron.schedule('0 18 * * 2', async () => {
    var setting = await Setting.findOne({})
    var operation_date = setting.this_week_folder_name
    var cron_query = { operation_date }
    var cron_table = await Cron_table.findOne(cron_query)
    var full_date = operation_date.replace(/-/g, "_");

    var present = setting.week_number
    var past = Number(setting.week_number) - 1

    var rating_present = "week" + present + "_rating"
    var rating_past = "week" + past + "_rating"

    var above_6 = await Merge.find({ $and: [{ [rating_past]: { $exists: false } }, { [rating_present]: { $exists: true } }] }).countDocuments({})

    var below_6 = await Merge.find({ [rating_present]: { $exists: false } }).countDocuments({})

    if (cron_table.margin_of_1_end == 1 && cron_table.above_500_votes_end == 1) {
        if (cron_table.is_mail_sent == 1) { // don't send
            // res.send({ 'status': 1, 'message': 'Email already sent' })
            console.log("Email already sent", moment(new Date()).format("LTS"))
        } else {
            var emailtest = {
                "fromEmail": "",
                "fromName": "",
                "hostname": "smtp.sparkpostmail.com",
                "userName": "",
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
                "<p>ALERTS REQUIRED BY AQUISITION TEAM</p><br><p>The following are the alerts raised for IMDb data analysis</p><br><ul><li><a href = 'http://139.59.18.134:5000/emaildata?id=1'>All Shows that have increased from Above 6 by a margin of 1 full point in ratings : " + cron_table.margin_of_1 + "</a></li><li><a href = 'http://139.59.18.134:5000/emaildata?id=2'> All Shows that have increased from Above 6 and an increase of atleast 500 votes: " + cron_table.above_500_votes + "</a></li><li><a href = 'http://139.59.18.134:5000/emaildata?id=3'>All Shows that have increased their rating from below 6 to above 6 : " + above_6 + "</a></li><li><a href = 'http://139.59.18.134:5000/emaildata?id=4'>All Shows that have decreased their rating from above 6 to below 6 : " + below_6 + "</a></li></ul>";
            mailOptions = {
                from: emailtest.fromEmail,
                to: "santosh.kumar@goquestmedia.com,vivek@goquestmedia.com",
                subject: "ALERTS EMAIL",
                html: link
            };
            transporter.sendMail(mailOptions, async function (error, info) {
                var setting_update = await Setting.updateOne({}, { is_process_complete: 1 });
                if (!error) {
                    var send_email = await Cron_table.updateOne(cron_query, { is_mail_sent: 1, is_mail_sent_on: new Date() })
                    fs.unlinkSync(filepath + full_date + "/" + "title.akas.tsv");
                    fs.unlinkSync(filepath + full_date + "/" + "title.basics.tsv");
                    fs.unlinkSync(filepath + full_date + "/" + "title.ratings.tsv");
                    // res.send({ 'status': 1, "message": "Email sent", data: { info, error } })
                    console.log("Email sent", moment(new Date()).format("LTS"))

                }
            });
        }
    } else {
        console.log('data not set bedore mail');
        var setting_update = await Setting.updateOne({}, { is_process_complete: 1 })
    }
})
// check_mail
cron.schedule('30 18 * * 2', async () => {

    var setting = await Setting.findOne({})
    var operation_date = setting.this_week_folder_name
    var cron_query = { operation_date }
    var cron_table = await Cron_table.findOne(cron_query)
    var error = []
    var warning = []
    const { is_download_unzip_akas_start, is_download_unzip_akas_end, is_dumping_akas_start, is_dumping_akas_end, is_download_unzip_title_start, is_download_unzip_title_end, is_dumping_title_start, is_dumping_title_end, is_download_unzip_rating_start, is_download_unzip_rating_end, is_dumping_rating_start, is_dumping_rating_end, margin_of_1, is_merging_start, is_merging_end, margin_of_1_start, margin_of_1_end, above_500_votes, above_500_votes_start, above_500_votes_end, is_mail_sent, under_production } = cron_table
    if (is_download_unzip_akas_start == 0) { error.push("AKAS downloading and unzipping did not start") }
    if (is_download_unzip_akas_end == 0) { error.push("AKAS downloading and unzipping did not end") }
    if (is_dumping_akas_start == 0) { error.push("AKAS data dumping did not start") }
    if (is_dumping_akas_end == 0) { error.push("AKAS data dumping did not end") }
    if (is_download_unzip_title_start == 0) { error.push("Title downloading and unzipping did not start") }
    if (is_download_unzip_title_end == 0) { error.push("AKAS downloading and unzipping did not end") }
    if (is_dumping_title_start == 0) { error.push("Title data dumping did not start") }
    if (is_dumping_title_end == 0) { error.push("Title data dumping did not end") }
    if (is_download_unzip_rating_start == 0) { error.push("Rating downloading and unzipping did not start") }
    if (is_download_unzip_rating_end == 0) { error.push("Rating downloading and unzipping did not end") }
    if (is_dumping_rating_start == 0) { error.push("Rating data dumping did not start") }
    if (is_dumping_rating_end == 0) { error.push("Rating data dumping did not end") }
    if (margin_of_1 == 0) { warning.push("Margin of 1 data is 0.") }
    if (is_merging_start == 0) { error.push("Merging of data did not start") }
    if (is_merging_end == 0) { error.push("Merging of data did not end") }
    if (margin_of_1_start == 0) { error.push("Margin of 1 data grouping did not start") }
    if (margin_of_1_end == 0) { error.push("Margin of 1 data grouping did not end") }
    if (above_500_votes == 0) { warning.push("Above 500 votes data is 0.") }
    if (under_production == 0) { warning.push("Under production data is 0.") }
    if (above_500_votes_start == 0) { error.push("Above 500 votes data grouping did not start") }
    if (above_500_votes_end == 0) { error.push("Above 500 votes data grouping did not end") }
    if (is_mail_sent == 0) { error.push("Email was not sent") }

    var process_status = (setting.is_process_complete == 0) ? "No" : "Yes"
    var error_message = (error.length > 0) ? "There were some errors in the system, this week." : "No error were found this week."
    var warning_message = (warning.length > 0) ? "There were some warnings in the system, this week." : "No warnings were raised this week."
    var error_list = ""
    if (error.length > 0) {
        error.forEach(element => {
            error_list += "<li>" + element + "</li>"
        });
    }
    var warning_list = ""
    if (warning.length > 0) {
        warning.forEach(element => {
            warning_list += "<li>" + element + "</li>"
        });
    }
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
    link = "<p>Hi</p>" + "<p>" + error_message + "</p>" + "<ul>" + error_list + "</ul></br>" + "<p>" + warning_message + "</p>" + "<ul>" + warning_list + "</ul></br>" + "<strong><p>DID THE PROCESS COMPLETE?: " + process_status + "</p></strong>";
    mailOptions = {
        from: emailtest.fromEmail,
        to: "santosh.kumar@goquestmedia.com",
        subject: "RATING ANALYSIS- PROCESS STATUS MAIL",
        html: link
    };
    transporter.sendMail(mailOptions, async function (error, info) {
        console.log(error, info);
        // res.send({ error, info })
    });

})

module.exports = router;