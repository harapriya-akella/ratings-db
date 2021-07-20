var mongoose = require("mongoose");
var cron_table = new mongoose.Schema({
    // create cron table => delete tables => unzip/download => dumping => merging => email alerts

    // STEP-1
    created_on: Date,

    operation_date: String,

    merge_limit: Number,
    merge_offset: Number,

    limit: Number,
    offset: Number,
    // STEP-2
    is_delete_akas_start: Number,
    is_delete_akas_start_datetime: Date,
    is_delete_akas_end: Number,
    is_delete_akas_end_datetime: Date,
    is_download_unzip_akas_start: Number,
    is_download_unzip_akas_start_datetime: Date,
    is_download_unzip_akas_end: Number,
    is_download_unzip_akas_end_datetime: Date,
    is_dumping_akas_start: Number,
    is_dumping_akas_start_datetime: Date,
    is_dumping_akas_end: Number,
    is_dumping_akas_end_datetime: Date,
    is_akas_convert: Number,
    is_akas_split: Number,
    akas_file_total_count: Number,
    akas_file_pointer: Number,

    is_delete_title_start: Number,
    is_delete_title_start_datetime: Date,
    is_delete_title_end: Number,
    is_delete_title_end_datetime: Date,
    is_download_unzip_title_start: Number,
    is_download_unzip_title_start_datetime: Date,
    is_download_unzip_title_end: Number,
    is_download_unzip_title_end_datetime: Date,
    is_dumping_title_start: Number,
    is_dumping_title_start_datetime: Date,
    is_dumping_title_end: Number,
    is_dumping_title_end_datetime: Date,
    is_title_convert: Number,
    is_title_split: Number,
    title_file_total_count: Number,
    title_file_pointer: Number,

    is_delete_rating_start: Number,
    is_delete_rating_start_datetime: Date,
    is_delete_rating_end: Number,
    is_delete_rating_end_datetime: Date,
    is_download_unzip_rating_start: Number,
    is_download_unzip_rating_start_datetime: Date,
    is_download_unzip_rating_end: Number,
    is_download_unzip_rating_end_datetime: Date,
    is_dumping_rating_start: Number,
    is_dumping_rating_start_datetime: Date,
    is_dumping_rating_end: Number,
    is_dumping_rating_end_datetime: Date,
    is_rating_convert: Number,
    is_rating_split: Number,
    rating_file_total_count: Number,
    rating_file_pointer: Number,
    // STEP-3
    is_merging_start: Number,
    is_merging_start_datetime: Date,
    is_merging_end: Number,
    is_merging_end_datetime: Date,
    total_data_this_week: Number, // with filters rating > 6; tv series; mini series; > year 2015
    // STEP-4
    // deleting the data before inserting
    is_delete_margin_of_1_start: Number,
    is_delete_margin_of_1_start_datetime: Date,
    is_delete_margin_of_1_end: Number,
    is_delete_margin_of_1_end_datetime: Date,

    is_delete_above_500_votes_start: Number,
    is_delete_above_500_votes_start_datetime: Date,
    is_delete_above_500_votes_end: Number,
    is_delete_above_500_votes_end_datetime: Date,

    is_delete_above_6_start: Number,
    is_delete_above_6_start_datetime: Date,
    is_delete_above_6_end: Number,
    is_delete_above_6_end_datetime: Date,

    is_delete_below_6_start: Number,
    is_delete_below_6_start_datetime: Date,
    is_delete_below_6_end: Number,
    is_delete_below_6_end_datetime: Date,

    // collecting data for dashboard
    margin_of_1: Number,
    margin_of_1_start: Number,
    margin_of_1_start_datetime: Date,
    margin_of_1_end: Number,
    margin_of_1_end_datetime: Date,

    above_500_votes: Number,
    above_500_votes_start: Number,
    above_500_votes_start_datetime: Date,
    above_500_votes_end: Number,
    above_500_votes_end_datetime: Date,

    above_6: Number,
    above_6_start: Number,
    above_6_start_datetime: Date,
    above_6_end: Number,
    above_6_end_datetime: Date,

    below_6: Number,
    below_6_start: Number,
    below_6_start_datetime: Date,
    below_6_end: Number,
    below_6_end_datetime: Date,

    // STEP-5
    is_mail_sent: Number,
    is_mail_sent_on: Date,


    is_delete_under_production_start: Number,
    is_delete_under_production_end: Number,
    under_production: Number,

    main_language_limit: Number,
    main_country_limit: Number,

    above_500_votes_limit: Number,
    above_500_votes_offset: Number,
    margin_of_1_limit: Number,
    margin_of_1_offset: Number,

});

var Cron_table = mongoose.model("Cron_table", cron_table);
module.exports = Cron_table;