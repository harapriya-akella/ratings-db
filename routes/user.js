const express = require("express");
const Merge = require("../models/merge_schema");
const Cron_table = require("../models/cron_table_schema");
const router = express.Router();
const User = require("../models/user_schema");
const bcrypt = require("bcrypt");
var formidable = require('formidable');
var shell = require('shelljs');
var file_config = require('config');
var fs = require('fs');
var otpGenerator = require("otp-generator");
var Setting = require("../models/settings_schema")
var moment = require('moment')

router.post("/list", (req, res) => {
    var obj = {}
    if (req.body.id) {
        obj._id = req.body.id
    }
    User.find(obj, (err, data) => {
        res.send({ 'status': 1, data })
    })
})

router.post("/dashboard", async (req, res) => {
    var setting = await Setting.findOne({})
    var operation_date = setting.this_week_folder_name

    if (setting.is_process_complete == 1) {
        var week_number = setting.week_number
    } else {
        var week_number = Number(setting.week_number - 1)
    }
    var present = week_number
    var past = week_number - 1

    var rating_present = "week" + present + "_rating"
    var rating_past = "week" + past + "_rating"
    if (!operation_date) {
        res.send({
            status: 1,
            data: {
                titles: 0,
                margin_of_1: 0,
                above_500_votes: 0,
                above_6: 0,
                below_6: 0,
                todays_date: ""
            }
        })
    } else {
        Cron_table.findOne({ _id: setting.cron_id }, async (err, cron) => {
            var above_6 = await Merge.find({ $and: [{ [rating_past]: { $exists: false } }, { [rating_present]: { $exists: true } }] }).count()
            var below_6 = await Merge.find({ [rating_present]: { $exists: false } }).count()
            res.send({
                status: 1,
                data: {
                    titles: await Merge.countDocuments({ averageRating: { $gte: 6 } }),
                    margin_of_1: cron.margin_of_1,
                    above_500_votes: cron.above_500_votes,
                    above_6: above_6,
                    below_6: below_6,
                    todays_date: cron.is_merging_end_datetime
                }
            })
        }).sort({ _id: 1 })
    }
})

router.post('/remove', function (req, res) {
    if (req.body.id) {
        var sql = "SELECT * FROM user WHERE id = " + req.body.id;
        config.query(sql, function (err, rows) {
            if (err) {
                res.send({ 'status': 0, 'message': err.stack })
            } else {
                if (rows.length > 0) {
                    var delete_query = "DELETE FROM user WHERE id = " + req.body.id
                    config.query(delete_query, (err, del) => {
                        if (err) {
                            res.send({ 'status': 0, 'message': error.stack })
                        } else {
                            res.send({ 'status': 1, 'message': 'User deleted successfully' })
                        }
                    })
                } else {
                    res.send({ 'status': 0, 'message': 'User not found' })
                }
            }
        });
    } else {
        res.send({ 'status': 0, 'message': 'Please enter user ID' })
    }
});

router.post('/withprofilepicadd', (req, res) => {
    console.log("start")
    var oldpath = "";
    var form = new formidable.IncomingForm();
    form.parse(req, function (err, fields, files) {
        if (err) {
            res.send({ 'status': 0, 'message': err.stack });
        } else {
            var errors = ""
            // if (!files.profile_pic || files.profile_pic == "") {
            //     errors += "Please choose a profile_pic. "
            // }
            if (!fields.first_name || fields.first_name == "") {
                errors += "Please enter first name. "
            }
            if (!fields.last_name || fields.last_name == "") {
                errors += "Please enter last name. "
            }
            if (!fields.email || fields.email == "") {
                errors += "Please enter email ID. "
            }
            // if (!fields.phone_number || fields.phone_number == "") {
            //     errors += "Please enter phone number. "
            // }
            if (!fields.password || fields.password == "") {
                errors += "Please enter a password. "
            }
            if (!fields.repeat_password || fields.repeat_password == "") {
                errors += "Please enter your password again. "
            }
            if (errors) {
                res.send({ "status": 0, "message": errors });
            }
            else {
                console.log("======>4")
                if (files.profile_pic) {
                    if (files.profile_pic.type != "image/png" && files.profile_pic.type != "image/jpeg" && files.profile_pic.type != "image/jpg") {
                        res.send({ "status": 0, "message": "Choose a pdf or an image file" })
                    } else {
                        oldpath = files.profile_pic.path;
                        fileName = files.profile_pic.name;
                        console.log('OLd Path', oldpath);
                        console.log("file name", files.profile_pic.name)
                        console.log("file type", files.profile_pic.type)
                        console.log('New Path', fileName);
                        var newFileName = "doc_" + new Date().getHours() + new Date().getMinutes() + new Date().getMilliseconds() + files.profile_pic.name;
                        // var newpath = ""
                        var path = file_config.get('path');
                        newpath = path.filepath
                        console.log('the path of developement', newpath);
                        insertPath = newpath + newFileName;
                        console.log('inserting path is ', insertPath);
                        if (!fs.existsSync(newpath)) {
                            console.log('file not exist');
                            shell.mkdir('-p', newpath);
                            savePhoto(insertPath, newFileName, fields);
                        } else {
                            console.log('file exist');
                            savePhoto(insertPath, newFileName, fields);
                        }
                    }
                } else {
                    insertPath = ""
                    newFileName = ""
                    savePhoto(insertPath, newFileName, fields);
                }
            }
        }
    });
    function savePhoto(insertPath, newFileName, fields) {
        var userData = {
            first_name: fields.first_name,
            last_name: fields.last_name,
            email: fields.email,
            // phone_number: fields.phone_number,
        }
        console.log('inside save photos', insertPath);

        var main_app = file_config.get('app');
        var main_url = main_app.main_url + ":" + main_app.port;
        var getFileUrl = main_url + "/uploads/" + newFileName
        console.log("getFileUrl===>", getFileUrl);
        if (insertPath == "" && newFileName == "") {
            userData.profile_pic = ""
        } else {
            userData.profile_pic = getFileUrl
        }
        var pass = fields.password;
        if (fields.password) {
            bcrypt.hash(pass, 10, (err, hash) => {
                var pass2 = fields.repeat_password;
                bcrypt.compare(pass2, hash, async function (err, result) {
                    if (result) {
                        userData.password = hash
                        //check for email and phone number
                        // var find_user = await User.find({ $or: [{ email: userData.email }, { phone_number: userData.phone_number }] })
                        var find_user = await User.find({ $or: [{ email: userData.email }] })
                        if (find_user.length > 0) {
                            res.send({ 'status': 0, 'message': 'User email/phone number already exists. ' })
                        } else {
                            fs.rename(oldpath, insertPath, async function (err_upload) {
                                if (err_upload) {
                                    console.log('the error in upload', err_upload);
                                    res.send({ "status": 0, "message": err_upload.stack });
                                } else {
                                    console.log('upload success');
                                    var add_user = await User.create(userData)
                                    if (add_user) {
                                        res.send({ "status": 1, "message": "User details uploaded successfully." })
                                    } else {
                                        res.send({ 'status': 0, 'message': 'User not created' })
                                    }
                                }
                            })
                        }
                    } else {
                        res.send({ 'status': 0, 'message': 'Passwords not same.' })
                    }
                })
            })
        }
    }
});

router.post('/add', (req, res) => {
    console.log(req.body);
    var errors = ""
    var sent = "Please enter "
    var obj = {}
    if (!req.body.first_name || req.body.first_name == "") {
        errors += "first name, "
    } else {
        obj.first_name = req.body.first_name
    }
    if (!req.body.last_name || req.body.last_name == "") {
        errors += "last name, "
    } else {
        obj.last_name = req.body.last_name
    }
    if (!req.body.email || req.body.email == "") {
        errors += "email ID, "
    } else {
        obj.email = req.body.email
    }
    if (!req.body.password || req.body.password == "") {
        errors += "password, "
    }
    if (!req.body.repeat_password || req.body.repeat_password == "") {
        errors += "repeat password. "
    }
    if (errors) {
        res.send({ 'status': 0, 'message': sent + errors })
    } else {
        var pass = req.body.password
        bcrypt.hash(pass, 10, (err, hash) => {
            var pass2 = req.body.repeat_password;
            bcrypt.compare(pass2, hash, async function (err, result) {
                if (result) {
                    obj.password = hash
                    var find_user = await User.find({ email: req.body.email })
                    if (find_user.length > 0) {
                        res.send({ 'status': 0, 'message': 'User email already exists. ' })
                    } else {
                        var add_user = await User.create(obj)
                        if (add_user) {
                            res.send({ "status": 1, "message": "User details uploaded successfully." })
                        } else {
                            res.send({ 'status': 0, 'message': 'User not created' })
                        }
                    }
                } else {
                    res.send({ 'status': 0, 'message': 'Passwords not same.' })
                }
            })
        })
    }
});

router.post('/change_profile_pic', (req, res) => {
    console.log("start")
    var oldpath = "";
    var form = new formidable.IncomingForm();
    form.parse(req, async function (err, fields, files) {
        if (err) {
            res.send({ 'status': 0, 'message': err.stack });
        } else {
            if (fields.id) {
                var user_retrieve = await User.find({ _id: fields.id })
                if (user_retrieve.length > 0) {
                    var db_user = {}
                    user_retrieve.forEach(element => {
                        db_user.profile_pic = element.profile_pic
                    });
                    console.log("db_user", db_user)
                    if (files.profile_pic) {
                        if (files.profile_pic.type != "image/png" && files.profile_pic.type != "image/jpeg" && files.profile_pic.type != "image/jpg") {
                            res.send({ "status": 0, "message": "Choose a pdf or an image file" })
                        } else {
                            oldpath = files.profile_pic.path;
                            fileName = files.profile_pic.name;
                            console.log('OLd Path', oldpath);
                            console.log("file name", files.profile_pic.name)
                            console.log("file type", files.profile_pic.type)
                            console.log('New Path', fileName);
                            var newFileName = "doc_" + new Date().getHours() + new Date().getMinutes() + new Date().getMilliseconds() + files.profile_pic.name;
                            // var newpath = ""
                            var path = file_config.get('path');
                            newpath = path.filepath
                            console.log('the path of developement', newpath);
                            insertPath = newpath + newFileName;
                            console.log('inserting path is ', insertPath);
                            if (!fs.existsSync(newpath)) {
                                console.log('file not exist');
                                shell.mkdir('-p', newpath);
                                savePhoto(insertPath, newFileName, fields, db_user);
                            } else {
                                console.log('file exist');
                                savePhoto(insertPath, newFileName, fields, db_user);
                            }
                        }
                    } else {
                        var newFileName = ''
                        var insertPath = ''
                        savePhoto(insertPath, newFileName, fields, db_user);
                    }
                } else {
                    res.send({ 'status': 0, 'message': 'User not found' })
                }
            } else {
                res.send({ 'status': 0, 'message': 'Please enter user ID ' })
            }
        }
    });
    function savePhoto(insertPath, newFileName, fields, db_user) {
        if (newFileName) {
            console.log('inside save photos', insertPath);
            var main_app = file_config.get('app');
            var main_url = main_app.main_url + ":" + main_app.port;
            var getFileUrl = main_url + "/uploads/" + newFileName
            console.log("getFileUrl===>", getFileUrl);
        } else {
            var getFileUrl = db_user.profile_pic
        }

        var userData = {
            profile_pic: getFileUrl
        }
        var userID = fields.id
        if (insertPath) {
            fs.rename(oldpath, insertPath, function (err_upload) {
                if (err_upload) {
                    res.send({ "status": 0, "message": err_upload.stack });
                } else {
                    console.log('upload success');
                    update_user(userID, userData)
                }
            })
        } else {
            update_user(userID, userData)
        }
    }
    function update_user(userID, userData) {
        userData.modified_on = new Date()
        User.updateOne({ _id: userID }, userData, (err, user) => {
            if (err) {
                res.send({ 'status': 0, 'message': err.stack })
            } else {
                res.send({ 'status': 1, 'message': 'User update successfully' })
            }
        })
    }
});

router.post('/update_with_email_phone', (req, res) => {
    if (req.body.id) {
        var cust_query = {}
        if (req.body.phone_number) {
            var pn = req.body.phone_number
        }
        if (req.body.email) {
            var e = req.body.email
        }
        if (req.body.first_name) {
            cust_query.first_name = req.body.first_name
        }
        if (req.body.last_name) {
            cust_query.last_name = req.body.last_name
        }

        User.find({ email: e }, (err, email) => {
            if (err) {
                res.send({ 'status': 0, 'message': err.stack })
            } else {
                if (email.length > 0) {
                    email.forEach(element => {
                        ID = element._id
                    });
                    if (ID != req.body.id) {
                        res.send({ 'status': 0, 'message': 'Email ID already present' })
                        res.end()
                    } else {
                        cust_query.email = req.body.email
                    }
                } else {
                    cust_query.email = req.body.email
                }
                User.find({ phone_number: pn }, (err, phone) => {
                    if (err) {
                        res.send({ 'status': 0, 'message': err.stack })
                    } else {
                        if (phone.length > 0) {
                            phone.forEach(element => {
                                var ID = element._id
                            });
                            if (ID != req.body.id) {
                                res.send({ 'status': 0, 'message': 'Phone number already present' })
                                res.end()
                            } else {
                                cust_query.phone_number = req.body.phone_number
                            }
                        } else {
                            cust_query.phone_number = req.body.phone_number
                        }
                        User.updateOne({ _id: req.body.id }, cust_query, (err, up) => {
                            if (err) {
                                res.send({ 'status': 0, 'message': err.stack })
                            } else {
                                res.send({ 'status': 1, 'message': 'User update successful' })
                            }
                        })
                    }
                })
            }
        })
    } else {
        res.send({ 'status': 0, 'message': 'Please enter user ID ' })
    }
});

router.post('/update', (req, res) => {
    if (req.body.id) {
        var cust_query = {}
        if (req.body.email) {
            var e = req.body.email
        }
        if (req.body.first_name) {
            cust_query.first_name = req.body.first_name
        }
        if (req.body.last_name) {
            cust_query.last_name = req.body.last_name
        }

        User.find({ email: e }, (err, email) => {
            if (err) {
                res.send({ 'status': 0, 'message': err.stack })
            } else {
                if (email.length > 0) {
                    email.forEach(element => {
                        ID = element._id
                    });
                    if (ID != req.body.id) {
                        res.send({ 'status': 0, 'message': 'Email ID already present' })
                        res.end()
                    } else {
                        cust_query.email = req.body.email
                    }
                } else {
                    cust_query.email = req.body.email
                }
                User.updateOne({ _id: req.body.id }, cust_query, (err, up) => {
                    if (err) {
                        res.send({ 'status': 0, 'message': err.stack })
                    } else {
                        res.send({ 'status': 1, 'message': 'User update successful' })
                    }
                })
            }
        })
    } else {
        res.send({ 'status': 0, 'message': 'Please enter user ID ' })
    }
});

router.post('/change_password', (req, res) => {
    var cust_query = {}
    var errors = ''
    if (!req.body.password || req.body.password == "") {
        errors += 'Please enter password. '
    }
    if (!req.body.new_password || req.body.new_password == "") {
        errors += 'Please enter new password. '
    }
    if (!req.body.repeat_password || req.body.repeat_password == "") {
        errors += 'Please enter the new password again. '
    }
    if (!req.body.id || req.body.id == "") {
        errors += 'Please enter user ID. '
    }
    if (errors) {
        res.send({ 'status': 0, 'message': errors })
    } else {
        User.find({ _id: req.body.id }, (err, user) => {
            if (err) {
                res.send({ 'status': 0, 'message': err.stack })
            } else {
                var old_password = ''
                user.forEach(element => {
                    old_password = element.password
                });
                console.log("old_password", old_password)
                bcrypt.compare(req.body.password, old_password, (err, result) => {
                    console.log("err-1", err)
                    console.log("result", result)
                    if (result) {
                        var pass = req.body.new_password
                        bcrypt.hash(pass, 10, function (err, hash) {
                            console.log("hash", hash)
                            var pass2 = req.body.repeat_password;
                            bcrypt.compare(pass2, hash, function (err, result2) {
                                console.log("err-2", err)
                                console.log("result2", result2)
                                if (result2) {
                                    //true
                                    cust_query.password = hash
                                    User.updateOne({ _id: req.body.id }, cust_query, (err, up_pass) => {
                                        if (err) {
                                            res.send({ 'status': 0, 'message': err.stack })
                                        } else {
                                            res.send({ 'status': 1, 'message': 'Password has been changed' })
                                        }
                                    })
                                } else {
                                    res.send({ 'status': 0, 'message': 'Please repeat the new password' })
                                }
                            })
                        })
                    } else {
                        res.send({ 'status': 0, 'message': 'Please enter your old password correctly' })
                    }
                })
                // 		var pass = req.body.password;
                //   bcrypt.hash(pass, 8, function (err, hash) {
                //     // Store hash in database
                //     var pass2 = req.body.repeat_password;
                //     bcrypt.compare(pass2, hash, function (err, result) {
            }
        })
    }
})

router.post('/login', async (req, res) => {
    console.log(req.body);
    if (req.body.email) {
        if (req.body.password) {
            var user = await User.find({ email: req.body.email })
            console.log("user", user);
            if (user.length > 0) {
                user.forEach(element => {
                    user_first_name = element.first_name
                    user_last_name = element.last_name
                    user_password = element.password
                    user_email = element.email
                    // user_phone_number = element.phone_number
                    // user_profile_pic = element.profile_pic
                    user_id = element._id
                });
                bcrypt.compare(req.body.password, user_password, (err, result) => {
                    if (err) {
                        res.send({ 'status': 0, 'message': err.stack })
                    } else {
                        if (result) {
                            res.send({
                                'status': 1,
                                'data': {
                                    'id': user_id,
                                    'first_name': user_first_name,
                                    'last_name': user_last_name,
                                    'email': user_email,
                                    // 'phone_number': user_phone_number,
                                    // 'profile_pic': user_profile_pic,
                                }
                            })
                        } else {
                            res.send({ 'status': 0, 'message': 'Invalid credentials' })
                        }
                    }
                })
            } else {
                res.send({ 'status': 0, 'message': 'User does not exist' })
            }
        } else {
            res.send({ 'status': 0, 'message': 'Please enter password' })
        }
    } else {
        res.send({ 'status': 0, 'message': 'Please enter email ID' })
    }
})

router.post("/verify_otp", (req, res) => {
    //forgot password
    if (!req.body.otp || req.body.otp == "") {
        res.send({ status: 0, message: "Please enter otp" });
    } else if (!req.body.phone_number || req.body.phone_number == "") {
        res.send({ status: 0, message: "Enter phone number" });
    } else {
        var find_user = "SELECT * FROM user WHERE phone_number = '" + req.body.phone_number + "'"
        config.query(find_user, (err, user) => {
            if (err) {
                res.send({ 'status': 0, 'message': err.stack })
            } else {
                if (user.length > 0) {
                    user.forEach(element => {
                        given_otp = element.otp
                    });
                    if (given_otp == req.body.otp) {
                        var otp_generated = otpGenerator.generate(4, {
                            digit: true,
                            specialChars: false,
                            upperCase: false,
                            alphabets: false
                        });
                        var upadte_user = " UPDATE user SET is_verified = 1, otp = '" + otp_generated + "' WHERE phone_number = '" + req.body.phone_number + "'"
                        config.query(upadte_user, (err, up) => {
                            if (err) {
                                res.send({ 'status': 0, 'message': err.stack })
                            } else {
                                res.send({ 'status': 1, 'message': 'OTP verified' })
                            }
                        })
                    } else {
                        res.send({ 'status': 0, 'message': 'OTP could not be verified' })
                    }
                } else {
                    res.send({ 'status': 0, 'message': 'Phone number not registered' })
                }
            }
        })
    }
});

module.exports = router;