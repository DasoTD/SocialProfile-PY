const UserService = require("./service");
const bcrypt = require("bcryptjs");
const randomstring = require("randomstring");
const {
  HttpStatusCode,
  ResponseStatus,
  createResponse,
  adminResponseLogger,
  VARIANTS,
  STATUSES,
  logger,
} = require("../../common");
const {
  USER_DISABLE_CODE,
  USER_ENABLE_CODE,
  SALT,
  INVESTMENT_TERMINATE_CODE,
  INVESTMENT_NOT_TERMINATE_CODE,
} = require("../../config");

const {
  ActivityLogServices,
  staffDetails,
  adminResetPassword,
  sendMail,
} = require("../../utils");
const { Op } = require("sequelize");
const sequelize = require("sequelize");

class UserController {
  static async allUsers(req, res) {
    try {
      const USER = [];
      const authUser = req.user;
      const {
        registrationDate,
        startDate,
        endDate,
        inActiveCustomers,
        gender,
        ageRange,
        firstTimeInvestor,
      } = req.query;
      const query = {};

      if (registrationDate) {
        query.DateOfEntry = sequelize.where(
          sequelize.cast(sequelize.col("DateOfEntry"), "DATE"),
          "=",
          registrationDate
        );
      }

      if (startDate && endDate) {
        query.DateOfEntry = {
          [Op.between]: [startDate, endDate],
        };
        // query.DateOfEntry = {
        //         [Op.gte]: startDate,
        //         [Op.lte]: endDate //new Date(new Date(startDate).setHours(00, 00, 00))
        // }
      }
      if (inActiveCustomers) {
        query.InvestmentCount = {
          [Op.or]: [{ [Op.eq]: 0 }, { [Op.eq]: null }],
        };
      }
      
      if (gender && gender.toLowerCase() == "male") {
        query.Gender = {
          [Op.eq]: 1, // this is hardcoding I need to remove this
        };
      }
      if (gender && gender.toLowerCase() == "female") {
        query.Gender = {
          [Op.eq]: 0, // this is hardcoding I need to remove this
        };
      }
      if (firstTimeInvestor) {
        query.InvestmentCount = {
          [Op.eq]: 1,
        };
      }

      const users = await UserService.allUser(query);
      let AGE = 0;
      for (let i = 0; i < users.rows.length; i++) {
        const user = users.rows[i];
        let dob = user.DateOfBirth.toString();
        let year = dob.substring(11, 15);
        let today = new Date();
        AGE = Number(today.getFullYear()) - Number(year);
        if (ageRange && ageRange == "18-30") {
          if (AGE > 17 && AGE < 31) {
            USER.push(user);
          }
        } else if (ageRange && ageRange == "31-41") {
          if (AGE > 30 && AGE < 42) {
            console.log(AGE);
            USER.push(user);
          }
        } else if (ageRange && ageRange == "42+") {
          if (AGE > 41) {
            console.log(AGE);
            USER.push(user);
          }
        } else {
          USER.push(user);
        }
      }

      const userReqData = await staffDetails(req.user.Username);
      ActivityLogServices.createLog({
        UserId: authUser.UserId,
        Module: "User Management",
        Initiator: `${userReqData.firstname} ${userReqData.surname}`,
        Target: `all`,
        Action: "viewed",
        Description: " users",
      });
      const response = {
        message: "users fetched successfully",
        USER,
      };
      return createResponse(
        res,
        HttpStatusCode.StatusOk,
        ResponseStatus.Success,
        response
      );
    } catch (error) {
      return createResponse(
        res,
        HttpStatusCode.StatusInternalServerError,
        ResponseStatus.Error,
        `Error: ${error.message}`
      );
    }
  }

  static async getUser(req, res) {
    try {
      const { id } = req.query;
      const user = await UserService.getUserById(id);
      if (!user) {
        return createResponse(
          res,
          HttpStatusCode.StatusNotFound,
          ResponseStatus.Failure,
          `user does not exist`
        );
      }
      let totalInvestmentMade = 0;
      const rewards = await UserService.getRewardsByID(id);
      const targets = await UserService.getTargetsByID(id);
      const fixed = await UserService.getFixedByID(id);

      totalInvestmentMade = rewards.length + targets.length + fixed.length;

      const response = {
        message: "users fetched successfully",
        user,
        totalInvestmentMade,
      };
      return createResponse(
        res,
        HttpStatusCode.StatusOk,
        ResponseStatus.Success,
        response
      );
    } catch (error) {
      return createResponse(
        res,
        HttpStatusCode.StatusInternalServerError,
        ResponseStatus.Error,
        `Error: ${error.message}`
      );
    }
  }

  static async blockUser(req, res) {
    try {
      const authUser = req.user;
      const { id } = req.query;
      const user = await UserService.getUserById(id);
      if (!user) {
        return createResponse(
          res,
          HttpStatusCode.StatusNotFound,
          ResponseStatus.Failure,
          `user does not exist`
        );
      }
      const query = {};
      query.IsBlocked = USER_DISABLE_CODE;
      query.LastUpdated = new Date();
      const updateUser = await UserService.updateUser(query, user.UserId);
      const userReqData = await staffDetails(req.user.Username);
      ActivityLogServices.createLog({
        UserId: authUser.UserId,
        Module: "User Management",
        Initiator: `${userReqData.firstname} ${userReqData.surname}`,
        Target: ` ${user.Username}`,
        Action: "blocked",
        Description: "account",
      });
      const response = {
        message: "user blocked successfully",
      };
      return createResponse(
        res,
        HttpStatusCode.StatusOk,
        ResponseStatus.Success,
        response
      );
    } catch (error) {
      return createResponse(
        res,
        HttpStatusCode.StatusInternalServerError,
        ResponseStatus.Error,
        `Error: ${error.message}`
      );
    }
  }

  static async unBlockUser(req, res) {
    try {
      const authUser = req.user;
      const { id } = req.query;
      const user = await UserService.getUserById(id);
      if (!user) {
        return createResponse(
          res,
          HttpStatusCode.StatusNotFound,
          ResponseStatus.Failure,
          `user does not exist`
        );
      }
      const query = {};
      query.IsBlocked = USER_ENABLE_CODE;
      query.LastUpdated = new Date();
      const updateUser = await UserService.updateUser(query, user.UserId);
      const userReqData = await staffDetails(req.user.Username);
      ActivityLogServices.createLog({
        UserId: authUser.UserId,
        Module: "User Management",
        Initiator: `${userReqData.firstname} ${userReqData.surname}`,
        Target: ` ${user.Username}`,
        Action: "unblock",
        Description: "account",
      });
      const response = {
        message: "user unblocked successfully",
      };
      return createResponse(
        res,
        HttpStatusCode.StatusOk,
        ResponseStatus.Success,
        response
      );
    } catch (error) {
      return createResponse(
        res,
        HttpStatusCode.StatusInternalServerError,
        ResponseStatus.Error,
        `Error: ${error.message}`
      );
    }
  }

  static async UpdateUser(req, res) {
    try {
      const authUser = req.user;
      const { id } = req.query;
      const { phoneNumber, email } = req.body;
      const user = await UserService.getUserById(id);
      if (!user) {
        return createResponse(
          res,
          HttpStatusCode.StatusNotFound,
          ResponseStatus.Failure,
          `user does not exist`
        );
      }
      const query = {};
      if (phoneNumber) query.MobileNumber = phoneNumber;
      if (email) query.EmailAddress = email;
      const updateUser = await UserService.updateUser(query, user.UserId);
      const userReqData = await staffDetails(req.user.Username);
      ActivityLogServices.createLog({
        UserId: authUser.UserId,
        Module: "User Management",
        Initiator: `${userReqData.firstname} ${userReqData.surname}`,
        Target: ` ${user.Username}`,
        Action: "updated",
        Description: "details",
      });
      const response = {
        message: "user updated successfully",
      };
      return createResponse(
        res,
        HttpStatusCode.StatusOk,
        ResponseStatus.Success,
        response
      );
    } catch (error) {
      return createResponse(
        res,
        HttpStatusCode.StatusInternalServerError,
        ResponseStatus.Error,
        `Error: ${error.message}`
      );
    }
  }

  static async initiateResetPassword(req, res) {
    try {
      const authUser = req.user;
      const { id } = req.query;
      const userReqData = await staffDetails(req.user.Username);
      const user = await UserService.getUserById(id);
      if (!user) {
        return createResponse(
          res,
          HttpStatusCode.StatusNotFound,
          ResponseStatus.Failure,
          `user does not exist`
        );
      }
      const status = STATUSES["Awaiting Approval"];
      if (user.StatusId === status)
        return createResponse(
          res,
          HttpStatusCode.StatusBadRequest,
          ResponseStatus.Failure,
          "An action is pending on this account"
        );
      await user.update({
        flag: "PENDING PASSWORD UPDATE",
        StatusId: status,
        Initiator: `${userReqData.firstname} ${userReqData.surname}`,
      });

      await user.save();

      ActivityLogServices.createLog({
        UserId: authUser.UserId,
        Module: "User Management",
        Initiator: `${userReqData.firstname} ${userReqData.surname}`,
        Target: ` ${user.Username}`,
        Action: "initiated",
        Description: "password reset",
      });

      const response = {
        message: "successful",
      };

      return createResponse(
        res,
        HttpStatusCode.StatusOk,
        ResponseStatus.Success,
        response
      );
    } catch (error) {
      return createResponse(
        res,
        HttpStatusCode.StatusInternalServerError,
        ResponseStatus.Error,
        `Error: ${error.message}`
      );
    }
  }

  static async resetPassword(req, res) {
    try {
      const authUser = req.user;
      const { id } = req.query;
      const user = await UserService.getUserById(id);
      if (!user) {
        return createResponse(
          res,
          HttpStatusCode.StatusNotFound,
          ResponseStatus.Failure,
          `user does not exist`
        );
      }
      const checkStatus = STATUSES["Awaiting Approval"];
      if (user.StatusId !== checkStatus)
        return createResponse(
          res,
          HttpStatusCode.StatusBadRequest,
          ResponseStatus.Failure,
          "No pending action on this account"
        );
      const status = STATUSES["Approved"];
      const newPassword = randomstring.generate({
        length: 8,
        charset: "alphanumeric",
      });
      const encryptedPassword = await bcrypt.hash(
        newPassword.toString(),
        Number(SALT)
      );
      await user.update({
        StatusId: status,
        flag: "PASSWORD UPDATE APPROVED",
        Password: encryptedPassword,
      });
      await user.save();

      const body = await adminResetPassword(
        user.firstname,
        newPassword,
        "New  Password"
      );
      sendMail(body, user.Email, "New  Password");

      const userReqData = await staffDetails(req.user.Username);
      ActivityLogServices.createLog({
        UserId: authUser.UserId,
        Module: "User Management",
        Initiator: `${userReqData.firstname} ${userReqData.surname}`,
        Target: ` ${user.Username}`,
        Action: "approved",
        Description: "password reset",
      });

      const response = {
        message: "successful",
        newPassword,
      };
      return createResponse(
        res,
        HttpStatusCode.StatusOk,
        ResponseStatus.Success,
        response
      );
    } catch (error) {
      return createResponse(
        res,
        HttpStatusCode.StatusInternalServerError,
        ResponseStatus.Error,
        `Error: ${error.message}`
      );
    }
  }

  static async declineResetPassword(req, res) {
    try {
      const authUser = req.user;
      const { id } = req.query;
      const user = await UserService.getUserById(id);
      if (!user) {
        return createResponse(
          res,
          HttpStatusCode.StatusNotFound,
          ResponseStatus.Failure,
          `user does not exist`
        );
      }
      const checkStatus = STATUSES["Awaiting Approval"];
      if (user.StatusId !== checkStatus)
        return createResponse(
          res,
          HttpStatusCode.StatusBadRequest,
          ResponseStatus.Failure,
          "No pending action on this account"
        );
      const status = STATUSES["Rejected"];

      await user.update({
        StatusId: status,
        flag: "PASSWORD UPDATE DECLINED",
      });
      await user.save();
      const userReqData = await staffDetails(req.user.Username);
      ActivityLogServices.createLog({
        UserId: authUser.UserId,
        Module: "User Management",
        Initiator: `${userReqData.firstname} ${userReqData.surname}`,
        Target: ` ${user.Username}`,
        Action: "declined",
        Description: "password reset",
      });

      const response = {
        message: "successful",
      };
      return createResponse(
        res,
        HttpStatusCode.StatusOk,
        ResponseStatus.Success,
        response
      );
    } catch (error) {
      return createResponse(
        res,
        HttpStatusCode.StatusInternalServerError,
        ResponseStatus.Error,
        `Error: ${error.message}`
      );
    }
  }

  static async initiateEmailUpdate(req, res) {
    try {
      const { email } = req.body;
      const authUser = req.user;
      const userReqData = await staffDetails(req.user.Username);
      const { id } = req.query;
      const user = await UserService.getUserById(id);
      if (!user) {
        return createResponse(
          res,
          HttpStatusCode.StatusNotFound,
          ResponseStatus.Failure,
          `user does not exist`
        );
      }
      const status = STATUSES["Awaiting Approval"];
      if (user.StatusId === status || user.pFlag !== null)
        return createResponse(
          res,
          HttpStatusCode.StatusBadRequest,
          ResponseStatus.Failure,
          "An action is pending on this account"
        );
      await user.update({
        StatusId: status,
        flag: "PENDING EMAIL UPDATE",
        Initiator: `${userReqData.firstname} ${userReqData.surname}`,
        pFlag: JSON.stringify(email),
      });

      await user.save();

      ActivityLogServices.createLog({
        UserId: authUser.UserId,
        Module: "User Management",
        Initiator: `${userReqData.firstname} ${userReqData.surname}`,
        Target: ` ${user.Username}`,
        Action: "initiated",
        Description: "Email reset",
      });

      const response = {
        message: "successful",
      };

      return createResponse(
        res,
        HttpStatusCode.StatusOk,
        ResponseStatus.Success,
        response
      );
    } catch (error) {
      return createResponse(
        res,
        HttpStatusCode.StatusInternalServerError,
        ResponseStatus.Error,
        `Error: ${error.message}`
      );
    }
  }

  static async approveEmailUpdate(req, res) {
    try {
      const authUser = req.user;
      const { id } = req.query;
      const user = await UserService.getUserById(id);
      if (!user) {
        return createResponse(
          res,
          HttpStatusCode.StatusNotFound,
          ResponseStatus.Failure,
          `user does not exist`
        );
      }
      const checkStatus = STATUSES["Awaiting Approval"];
      if (user.StatusId !== checkStatus || user.pFlag === null)
        return createResponse(
          res,
          HttpStatusCode.StatusBadRequest,
          ResponseStatus.Failure,
          "No pending action on this account"
        );
      const status = STATUSES["Approved"];

      await user.update({
        StatusId: status,
        Email: JSON.parse(user.pFlag),
        flag: "EMAIL UPDATE APPROVED",
        pFlag: null,
      });
      await user.save();

      // const body = await adminResetPassword(
      //     user.firstname,
      //     newPassword,
      //     "New  Password"
      // );
      // sendMail(body, user.Email, "New  Password");

      const userReqData = await staffDetails(req.user.Username);
      ActivityLogServices.createLog({
        UserId: authUser.UserId,
        Module: "User Management",
        Initiator: `${userReqData.firstname} ${userReqData.surname}`,
        Target: ` ${user.Username}`,
        Action: "approved",
        Description: "Email reset",
      });

      const response = {
        message: "successful",
        newPassword,
      };
      return createResponse(
        res,
        HttpStatusCode.StatusOk,
        ResponseStatus.Success,
        response
      );
    } catch (error) {
      return createResponse(
        res,
        HttpStatusCode.StatusInternalServerError,
        ResponseStatus.Error,
        `Error: ${error.message}`
      );
    }
  }

  static async declineEmailUpdate(req, res) {
    try {
      const authUser = req.user;
      const { id } = req.query;
      const user = await UserService.getUserById(id);
      if (!user) {
        return createResponse(
          res,
          HttpStatusCode.StatusNotFound,
          ResponseStatus.Failure,
          `user does not exist`
        );
      }
      const checkStatus = STATUSES["Awaiting Approval"];
      if (user.StatusId !== checkStatus || user.pFlag === null)
        return createResponse(
          res,
          HttpStatusCode.StatusBadRequest,
          ResponseStatus.Failure,
          "No pending action on this account"
        );
      const status = STATUSES["Rejected"];

      await user.update({
        StatusId: status,
        flag: "EMAIL UPDATE DECLINED",
        pFlag: null,
      });
      await user.save();

      const userReqData = await staffDetails(req.user.Username);
      ActivityLogServices.createLog({
        UserId: authUser.UserId,
        Module: "User Management",
        Initiator: `${userReqData.firstname} ${userReqData.surname}`,
        Target: ` ${user.Username}`,
        Action: "declined",
        Description: "Email reset",
      });

      const response = {
        message: "successful",
        newPassword,
      };
      return createResponse(
        res,
        HttpStatusCode.StatusOk,
        ResponseStatus.Success,
        response
      );
    } catch (error) {
      return createResponse(
        res,
        HttpStatusCode.StatusInternalServerError,
        ResponseStatus.Error,
        `Error: ${error.message}`
      );
    }
  }

  static async initiatePhoneNumberUpdate(req, res) {
    try {
      const { phoneNumber } = req.body;
      const authUser = req.user;
      const userReqData = await staffDetails(req.user.Username);
      const { id } = req.query;
      const user = await UserService.getUserById(id);
      if (!user) {
        return createResponse(
          res,
          HttpStatusCode.StatusNotFound,
          ResponseStatus.Failure,
          `user does not exist`
        );
      }
      const status = STATUSES["Awaiting Approval"];
      if (user.StatusId === status || user.pFlag !== null)
        return createResponse(
          res,
          HttpStatusCode.StatusBadRequest,
          ResponseStatus.Failure,
          "An action is pending on this account"
        );
      await user.update({
        StatusId: status,
        flag: "PENDING MOBILE UPDATE",
        Initiator: `${userReqData.firstname} ${userReqData.surname}`,
        pFlag: JSON.stringify(phoneNumber),
      });

      await user.save();

      ActivityLogServices.createLog({
        UserId: authUser.UserId,
        Module: "User Management",
        Initiator: `${userReqData.firstname} ${userReqData.surname}`,
        Target: ` ${user.Username}`,
        Action: "initiated",
        Description: "mobile reset",
      });

      const response = {
        message: "successful",
      };

      return createResponse(
        res,
        HttpStatusCode.StatusOk,
        ResponseStatus.Success,
        response
      );
    } catch (error) {
      return createResponse(
        res,
        HttpStatusCode.StatusInternalServerError,
        ResponseStatus.Error,
        `Error: ${error.message}`
      );
    }
  }

  static async approvePhoneNumberUpdate(req, res) {
    try {
      const authUser = req.user;
      const { id } = req.query;
      const user = await UserService.getUserById(id);
      if (!user) {
        return createResponse(
          res,
          HttpStatusCode.StatusNotFound,
          ResponseStatus.Failure,
          `user does not exist`
        );
      }
      const checkStatus = STATUSES["Awaiting Approval"];
      if (user.StatusId !== checkStatus || user.pFlag === null)
        return createResponse(
          res,
          HttpStatusCode.StatusBadRequest,
          ResponseStatus.Failure,
          "No pending action on this account"
        );
      const status = STATUSES["Approved"];

      await user.update({
        StatusId: status,
        MobileNumber: JSON.parse(user.pFlag),
        flag: "MOBILE UPDATE APPROVED",
        pFlag: null,
      });
      await user.save();

      const userReqData = await staffDetails(req.user.Username);
      ActivityLogServices.createLog({
        UserId: authUser.UserId,
        Module: "User Management",
        Initiator: `${userReqData.firstname} ${userReqData.surname}`,
        Target: ` ${user.Username}`,
        Action: "approved",
        Description: "mobile reset",
      });

      const response = {
        message: "successful",
        newPassword,
      };
      return createResponse(
        res,
        HttpStatusCode.StatusOk,
        ResponseStatus.Success,
        response
      );
    } catch (error) {
      return createResponse(
        res,
        HttpStatusCode.StatusInternalServerError,
        ResponseStatus.Error,
        `Error: ${error.message}`
      );
    }
  }

  static async declinePhoneNumberUpdate(req, res) {
    try {
      const authUser = req.user;
      const { id } = req.query;
      const user = await UserService.getUserById(id);
      if (!user) {
        return createResponse(
          res,
          HttpStatusCode.StatusNotFound,
          ResponseStatus.Failure,
          `user does not exist`
        );
      }
      const checkStatus = STATUSES["Awaiting Approval"];
      if (user.StatusId !== checkStatus || user.pFlag === null)
        return createResponse(
          res,
          HttpStatusCode.StatusBadRequest,
          ResponseStatus.Failure,
          "No pending action on this account"
        );
      const status = STATUSES["Rejected"];

      await user.update({
        StatusId: status,
        flag: "MOBILE UPDATE DECLINED",
        pFlag: null,
      });
      await user.save();

      const userReqData = await staffDetails(req.user.Username);
      ActivityLogServices.createLog({
        UserId: authUser.UserId,
        Module: "User Management",
        Initiator: `${userReqData.firstname} ${userReqData.surname}`,
        Target: ` ${user.Username}`,
        Action: "declined",
        Description: "mobile reset",
      });

      const response = {
        message: "successful",
        newPassword,
      };
      return createResponse(
        res,
        HttpStatusCode.StatusOk,
        ResponseStatus.Success,
        response
      );
    } catch (error) {
      return createResponse(
        res,
        HttpStatusCode.StatusInternalServerError,
        ResponseStatus.Error,
        `Error: ${error.message}`
      );
    }
  }
}

module.exports = UserController;
