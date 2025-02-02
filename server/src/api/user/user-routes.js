const express = require('express');
const router = express.Router();
const { z } = require('zod');
const { User }=require("../../models/User")
const { HiddenUser } = require('../../models/HiddenUser');
const { Report } = require('../../models/Report');
const { BlacklistedKeyword } = require('../../models/BlacklistedKeyword');
const { Screenshot } = require('../../models/Screenshot');
const { HiddenMessage } = require('../../models/HiddenMessage');

const { authMiddleware }=require("../../middlewares")

const profileRoutes = require('./profile');

const HARASSER_THRESHOLD = 5;

router.use("/",profileRoutes)

router.post('/hide-user', authMiddleware, async (req, res) => {//-> {name: string, userId: "", platform: ""} // userId will be used to correctly identify user to hide
  try {
    const { name, userId, platform, profileUrl } = req.body;
    
    if (!name||!profileUrl) {
      return res.status(400).json({
        status: 'error',
        type: 'ValidationError',
        message: 'Name or ProfileUrl is required'
      });
    }

    const existingHiddenUser = await HiddenUser.findOne({
      name,
      profileUrl,
      hiddenBy: req.userId
    });

    if (existingHiddenUser) {
      return res.status(409).json({
        status: 'error',
        type: 'DuplicateError',
        message: 'User is already hidden'
      });
    }

    const hiddenUser = await HiddenUser.create({
      userId,
      name,
      profileUrl,
      hiddenBy: req.userId,
      platform: platform || 'unknown'
    });

    await User.findByIdAndUpdate(
      req.userId,
      { $push: { hiddenUsers: hiddenUser._id } }
    );

    res.status(201).json({
      status: 'success',
      data: {
        ...hiddenUser.toObject(),
        randomProfileImage: hiddenUser.randomProfileImage
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: 'error', 
      type: 'ServerError',
      message: 'Internal server error'
    });
  }
});

router.get('/hidden-users', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .populate('hiddenUsers');

    if (!user) {
      return res.status(404).json({
        status: 'error',
        type: 'NotFoundError',
        message: 'User not found'
      });
    }

    res.json({
      status: 'success',
      data: {
        hiddenUsers: user.hiddenUsers,
        total: user.hiddenUsers.length,
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: 'error',
      type: 'ServerError',
      message: 'Internal server error'
    });
  }
});

//-> {name: string, userId: ""}
router.post('/unhide', authMiddleware, async (req, res) => {
  try {
    const { userId, name, profileUrl } = req.body;

    if (!name||!profileUrl) {
      return res.status(400).json({
        status: 'error',
        type: 'ValidationError',
        message: 'Name is required'
      });
    }

    const hiddenUser = await HiddenUser.findOne({
      name,
      profileUrl,
      hiddenBy: req.userId
    });

    if (!hiddenUser) {
      return res.status(404).json({
        status: 'error',
        type: 'NotFoundError',
        message: 'Hidden user not found'
      });
    }

    await HiddenUser.findByIdAndDelete(hiddenUser._id);

    await User.findByIdAndUpdate(
      req.userId,
      { $pull: { hiddenUsers: hiddenUser._id } }
    );

    res.json({
      status: 'success',
      data: {
        message: 'User unhidden successfully',
        unHiddenUser: {
          userId: hiddenUser.userId,
          name: hiddenUser.name,
          profileUrl: hiddenUser.profileUrl,
          platform: hiddenUser.platform
        }
      }
    });

  } catch (error) {
    console.error('Unhide user error:', error);
    res.status(500).json({
      status: 'error',
      type: 'ServerError',
      message: 'Internal server error'
    });
  }
});

//-> {blacklist-keywords: ["","",""]}
router.post('/blacklist-keywords', authMiddleware, async (req, res) => {
  try {
    const { keywords } = req.body;

    if (!Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({
        status: 'error',
        type: 'ValidationError',
        message: 'Keywords must be a non-empty array'
      });
    }

    let blacklist = await BlacklistedKeyword.findOne({ createdBy: req.userId });

    if (blacklist) {
      blacklist.keywords = [...new Set([...blacklist.keywords, ...keywords])];
      await blacklist.save();
    } else {
      blacklist = await BlacklistedKeyword.create({
        keywords,
        createdBy: req.userId
      });
    }

    res.status(201).json({
      status: 'success',
      data: { blacklist }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: 'error',
      type: 'ServerError',
      message: 'Internal server error'
    });
  }
});

router.get('/blacklisted-keywords', authMiddleware, async (req, res) => {
  try {
    const blacklist = await BlacklistedKeyword.findOne({ createdBy: req.userId });

    res.json({
      status: 'success',
      data: {
        keywords: blacklist?.keywords || [],
        total: blacklist?.keywords?.length || 0
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: 'error',
      type: 'ServerError',
      message: 'Internal server error'
    });
  }
});

const screenshotSchema = z.object({
  screenshotUrl: z.string().url('Invalid screenshot URL'),
  time: z.string().datetime('Invalid timestamp'),
  platform: z.string().optional(),
  relatedReport: z.string().optional(),
  metadata: z.object({
    source: z.string().optional(),
    size: z.number().optional(),
    format: z.string().optional()
  }).optional()
});

router.post('/save-screenshot', authMiddleware, async (req, res) => {
  try {
    const validatedData = await screenshotSchema.parseAsync(req.body);

    const existingScreenshot = await Screenshot.findOne({
      screenshotUrl: validatedData.screenshotUrl,
      uploadedBy: req.userId
    });

    if (existingScreenshot) {
      return res.status(409).json({
        status: 'error',
        type: 'DuplicateError',
        message: 'Screenshot already exists'
      });
    }

    const screenshot = await Screenshot.create({
      ...validatedData,
      uploadedBy: req.userId,
      time: new Date(validatedData.time)
    });

    await User.findByIdAndUpdate(
      req.userId,
      { $push: { screenshots: screenshot._id } }
    );

    res.status(201).json({
      status: 'success',
      data: {
        screenshot: {
          id: screenshot._id,
          screenshotUrl: screenshot.screenshotUrl,
          time: screenshot.time,
          platform: screenshot.platform,
          metadata: screenshot.metadata,
          createdAt: screenshot.createdAt
        }
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        status: 'error',
        type: 'ValidationError',
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }

    console.error('Save screenshot error:', error);
    res.status(500).json({
      status: 'error',
      type: 'ServerError',
      message: 'Failed to save screenshot'
    });
  }
});

const querySchema = z.object({
  limit: z.string().regex(/^\d+$/).transform(Number).optional().default('10'),
  offset: z.string().regex(/^\d+$/).transform(Number).optional().default('0'),
  platform: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

router.get('/saved-screenshots', authMiddleware, async (req, res) => {
  try {
    const { limit, offset, platform, startDate, endDate } = await querySchema.parseAsync(req.query);

    const filters = { uploadedBy: req.userId }; // Add uploadedBy filter

    if (platform) {
      filters.platform = platform;
    }

    if (startDate || endDate) {
      filters.time = {};
      if (startDate) filters.time.$gte = new Date(startDate);
      if (endDate) filters.time.$lte = new Date(endDate);
    }

    const screenshots = await Screenshot.find(filters)
      .sort({ time: -1 })
      .skip(offset)
      .limit(limit)
      .select('screenshotUrl time platform metadata createdAt'); // Select specific fields

    const total = await Screenshot.countDocuments(filters);

    res.json({
      status: 'success',
      data: {
        screenshots,
        pagination: {
          total,
          offset,
          limit,
          hasMore: offset + screenshots.length < total
        }
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        status: 'error',
        type: 'ValidationError',
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }

    console.error('Error fetching screenshots:', error);
    res.status(500).json({
      status: 'error',
      type: 'ServerError',
      message: 'Failed to fetch screenshots'
    });
  }
});


router.delete('/delete-screenshot/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const deletedScreenshot = await Screenshot.findOneAndDelete({
      _id: id,
      uploadedBy: req.userId 
    });

    if (!deletedScreenshot) {
      return res.status(404).json({
        status: 'error',
        type: 'NotFoundError',
        message: 'Screenshot not found'
      });
    }

    await User.findByIdAndUpdate(
      req.userId,
      { $pull: { screenshots: id } }
    );

    res.json({
      status: 'success',
      data: {
        message: 'Screenshot deleted successfully',
        deletedScreenshot: {
          id: deletedScreenshot._id,
          screenshotUrl: deletedScreenshot.screenshotUrl,
          time: deletedScreenshot.time,
          platform: deletedScreenshot.platform
        }
      }
    });

  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({
        status: 'error',
        type: 'ValidationError',
        message: 'Invalid screenshot ID format'
      });
    }

    console.error('Error deleting screenshot:', error);
    res.status(500).json({
      status: 'error',
      type: 'ServerError',
      message: 'Failed to delete screenshot'
    });
  }
});

// -----------havent tested report generation thingy yet, will be doing soom---------
//gotta figure out how to analyse these screenshots to generate report, using google model
const reportSchema = z.object({
  userName: z.string().min(1, "Username is required"),
  userId: z.string().min(1, "Enter Valid User ID").optional(),
  platform: z.string().min(1, "Platform is required"),
  reportType: z.enum(["harassment", "hate_speech", "threats", "stalking", "other"]),
  userProfileDetails: z.object({
    profileUrl: z.string().optional(),
    displayName: z.string(),
    accountCreationDate: z.string().datetime().optional(),
    bio: z.string().optional(),
  }),
  flaggedMessages: z.array(z.object({
    content: z.string(),
    timestamp: z.string().datetime(),
    type: z.enum(["text", "media", "voice"]),
    severity: z.enum(["low", "medium", "high"]).optional(),
  })).min(1, "At least one flagged message is required"),
  screenshots: z.array(z.object({
    screenshotUrl: z.string().url(),
    time: z.string().datetime(),
    context: z.string().optional()
  })).optional(),
  notes: z.string().optional(),
  severity: z.enum(["low", "medium", "high", "critical"]),
});

//-> {screenshotUrl:"",userName:"",notes: "",time:"",platform:"",userProfileDetails:{},flaggedMessages:[]}
router.post('/generate-report', authMiddleware, async (req, res) => {
  try {
    const validatedData = await reportSchema.parseAsync(req.body);
    
    // Create report document
    const report = await Report.create({
      ...validatedData,
      reportedBy: req.userId,
      reportStatus: "pending",
      evidenceTimeline: [
        ...validatedData.flaggedMessages.map(msg => ({
          time: new Date(msg.timestamp),
          type: "message",
          content: msg.content,
          severity: msg.severity
        })),
        ...(validatedData.screenshots?.map(ss => ({
          time: new Date(ss.time),
          type: "screenshot",
          content: ss.screenshotUrl,
          context: ss.context
        })) || [])
      ].sort((a, b) => a.time - b.time),
      metadata: {
        generatedAt: new Date(),
        lastUpdated: new Date(),
        totalEvidence: validatedData.flaggedMessages.length + (validatedData.screenshots?.length || 0),
        platformDetails: {
          name: validatedData.platform,
          reportedUserUrl: validatedData.userProfileDetails.profileUrl
        }
      }
    });

    await User.findByIdAndUpdate(
      req.userId,
      { $push: { reports: report._id } }
    );

    res.status(201).json({
      status: 'success',
      data: {
        reportId: report._id,
        summary: {
          reportedUser: report.userName,
          platform: report.platform,
          totalEvidence: report.metadata.totalEvidence,
          severity: report.severity,
          status: report.reportStatus
        }
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        status: 'error',
        type: 'ValidationError',
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }

    console.error('Report generation error:', error);
    res.status(500).json({
      status: 'error',
      type: 'ServerError',
      message: 'Failed to generate report'
    });
  }
});

router.get('/saved-reports', authMiddleware, async (req, res) => {
  try {
    const { limit = 10, offset = 0, status } = req.query;
    
    const filters = { reportedBy: req.userId };
    if (status) filters.reportStatus = status;

    const reports = await Report.find(filters)
      .sort({ 'metadata.generatedAt': -1 })
      .skip(Number(offset))
      .limit(Number(limit))
      .select([
        'userName',
        'platform',
        'reportType',
        'severity',
        'reportStatus',
        'metadata.generatedAt',
        'metadata.totalEvidence'
      ]);

    const total = await Report.countDocuments(filters);

    res.json({
      status: 'success',
      data: {
        reports,
        pagination: {
          total,
          offset: Number(offset),
          limit: Number(limit),
          hasMore: offset + reports.length < total
        }
      }
    });

  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({
      status: 'error',
      type: 'ServerError',
      message: 'Failed to fetch reports'
    });
  }
});


const hideMessageSchema = z.object({
  userName: z.string().min(1, 'Username is required'),
  profileUrl: z.string().url('Valid profile URL is required'),
  messageContent: z.string().min(1, 'Message content is required'),
  timeOfMessage: z.string().datetime('Valid timestamp is required'),
  platform: z.string().optional(),
  metadata: z.object({
    messageType: z.enum(['text', 'media', 'voice']).default('text'),
    context: z.string().optional(),
    source: z.string().optional()
  }).optional()
});

router.post('/hide-message', authMiddleware, async (req, res) => {
  try {
    const validatedData = await hideMessageSchema.parseAsync(req.body);
 
    const existingMessage = await HiddenMessage.findOne({
      messageContent: validatedData.messageContent,
      userName: validatedData.userName,
      profileUrl: validatedData.profileUrl,
      hiddenBy: req.userId,
      platform: validatedData.platform || 'unknown'
    });

    if (existingMessage) {
      return res.status(409).json({
        status: 'error',
        type: 'DuplicateError',
        message: 'This message has already been hidden',
        data: {
          existingMessage: {
            id: existingMessage._id,
            hiddenAt: existingMessage.createdAt
          }
        }
      });
    }

    let relatedHiddenUser = await HiddenUser.findOne({
      name: validatedData.userName,
      profileUrl: validatedData.profileUrl,
      hiddenBy: req.userId
    });

    if (!relatedHiddenUser) {
      relatedHiddenUser = await HiddenUser.create({
        name: validatedData.userName,
        profileUrl: validatedData.profileUrl,
        hiddenBy: req.userId,
        platform: validatedData.platform || 'unknown',
        reason: validatedData.reason || 'No reason specified'
      });
    }

    const hiddenMessage = await HiddenMessage.create({
      ...validatedData,
      timeOfMessage: new Date(validatedData.timeOfMessage),
      hiddenBy: req.userId,
      relatedHiddenUser: relatedHiddenUser._id
    });

    await User.findByIdAndUpdate(
      req.userId,
      {
        $inc: { totalBlockedMessages: 1 },
        $push: { hiddenMessages: hiddenMessage._id }
      }
    );

    const updateData = {
      $push: { hiddenMessages: hiddenMessage._id },
      $inc: { 'statistics.totalMessagesHidden': 1 },
      'statistics.lastMessageHidden': new Date()
    };

    if (!relatedHiddenUser.statistics?.firstMessageHidden) {
      updateData['statistics.firstMessageHidden'] = new Date();
    }

    await HiddenUser.findByIdAndUpdate(relatedHiddenUser._id, updateData);

    res.status(201).json({
      status: 'success',
      data: {
        hiddenMessage: {
          id: hiddenMessage._id,
          userName: hiddenMessage.userName,
          messageContent: hiddenMessage.messageContent,
          timeOfMessage: hiddenMessage.timeOfMessage,
          platform: hiddenMessage.platform,
          metadata: hiddenMessage.metadata,
          relatedHiddenUser: {
            id: relatedHiddenUser._id,
            name: relatedHiddenUser.name
          },
          createdAt: hiddenMessage.createdAt
        }
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        status: 'error',
        type: 'DuplicateError',
        message: 'This message has already been hidden'
      });
    }

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        status: 'error',
        type: 'ValidationError',
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }

    console.error('Hide message error:', error);
    res.status(500).json({
      status: 'error',
      type: 'ServerError', 
      message: 'Failed to hide message'
    });
  }
});


router.get('/hidden-messages', authMiddleware, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      userName,
      platform,
      startDate,
      endDate,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {
      hiddenBy: req.userId
    };

    if (userName) {
      query.userName = { $regex: new RegExp(userName, 'i') };
    }

    if (platform) {
      query.platform = platform;
    }

    if (startDate || endDate) {
      query.timeOfMessage = {};
      if (startDate) {
        query.timeOfMessage.$gte = new Date(startDate);
      }
      if (endDate) {
        query.timeOfMessage.$lte = new Date(endDate);
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortDirection = sortOrder.toLowerCase() === 'asc' ? 1 : -1;

    const [messages, totalCount] = await Promise.all([
      HiddenMessage.find(query)
        .sort({ [sortBy]: sortDirection })
        .skip(skip)
        .limit(parseInt(limit))
        .populate({
          path: 'relatedHiddenUser',
          select: 'name profileUrl statistics'
        }),
      HiddenMessage.countDocuments(query)
    ]);

    const formattedMessages = messages.map(message => ({
      id: message._id,
      userName: message.userName,
      messageContent: message.messageContent,
      timeOfMessage: message.timeOfMessage,
      platform: message.platform,
      metadata: message.metadata,
      createdAt: message.createdAt,
      relatedHiddenUser: message.relatedHiddenUser ? {
        id: message.relatedHiddenUser._id,
        name: message.relatedHiddenUser.name,
        profileUrl: message.relatedHiddenUser.profileUrl,
        statistics: message.relatedHiddenUser.statistics
      } : null
    }));

    res.status(200).json({
      status: 'success',
      data: {
        messages: formattedMessages,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          totalItems: totalCount,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Fetch hidden messages error:', error);
    res.status(500).json({
      status: 'error',
      type: 'ServerError',
      message: 'Failed to fetch hidden messages'
    });
  }
});

//we will allow users to search for harraser status for any other user from dashboard
router.get('/check-harasser', async (req, res) => {
  try {
    const { name, profileUrl } = req.query;

    if (!name || !profileUrl) {
      return res.status(400).json({
        status: 'error',
        type: 'ValidationError',
        message: 'Name and profileUrl are required query parameters'
      });
    }

    const hiddenInstances = await HiddenUser.find({
      name,
      profileUrl
    }).populate('hiddenBy', 'name email');

    const uniqueHiders = new Set(hiddenInstances.map(instance => 
      instance.hiddenBy._id.toString()
    ));
    const hideCount = uniqueHiders.size;
    const isHarasser = hideCount >= HARASSER_THRESHOLD;

    if (hiddenInstances.length > 0 && 
        hiddenInstances[0].isHarasser !== isHarasser) {
      await HiddenUser.updateMany(
        { name, profileUrl },
        { 
          $set: {
            isHarasser,
            totalHideCount: hideCount,
            lastReviewDate: new Date()
          }
        }
      );
    }

    const reports = await Report.find({
      name,
      'userProfileDetails.profileUrl': profileUrl
    }).select('reportType severity status createdAt');

    res.json({
      status: 'success',
      data: {
        isHarasser,
        statistics: {
          totalUniqueHiders: hideCount,
          threshold: HARASSER_THRESHOLD,
          totalReports: reports.length,
          reportSeverityBreakdown: reports.reduce((acc, report) => {
            acc[report.severity] = (acc[report.severity] || 0) + 1;
            return acc;
          }, {}),
          reportTypeBreakdown: reports.reduce((acc, report) => {
            acc[report.reportType] = (acc[report.reportType] || 0) + 1; 
            return acc;
          }, {})
        },
        hiddenBy: hiddenInstances.map(instance => ({
          userId: instance.hiddenBy._id,
          name: instance.hiddenBy.name,
          date: instance.createdAt,
          reason: instance.reason || 'Not specified'
        })),
        lastReviewDate: new Date(),
        metadata: {
          name,
          profileUrl,
          recentReports: reports
            .sort((a, b) => b.createdAt - a.createdAt)
            .slice(0, 3)
            .map(report => ({
              type: report.reportType,
              severity: report.severity,
              status: report.status,
              date: report.createdAt
            }))
        }
      }
    });
  } catch (error) {
    console.error('Check harasser status error:', error);
    res.status(500).json({
      status: 'error',
      type: 'ServerError',
      message: 'Failed to check harasser status'
    });
  }
});

router.get('/check-dummy-harasser', async (req, res) => {

    res.json({
      status: 'success',
      data: {
        isHarasser: true
      }
})
});

//maybe we can use this on dashboard 
router.get('/known-harassers', authMiddleware, async (req, res) => {
  try {
    const { platform } = req.query;
    const query = { isHarasser: true };
    if (platform) {
      query.platform = platform;
    }
    const harassers = await HiddenUser.find(query)
      .select('name profileUrl platform totalHideCount lastReviewDate randomProfileImage')
      .sort({ totalHideCount: -1 });

    const uniqueHarassers = Array.from(
      harassers.reduce((map, user) => {
        if (!map.has(user.profileUrl)) {
          map.set(user.profileUrl, {
            name: user.name,
            profileUrl: user.profileUrl,
            platform: user.platform,
            totalHideCount: user.totalHideCount,
            lastReviewDate: user.lastReviewDate,
            randomProfileImage: user.randomProfileImage
          });
        }
        return map;
      }, new Map())
    ).map(([_, value]) => value);
    res.json({
      status: 'success',
      data: {
        harassers: uniqueHarassers,
        total: uniqueHarassers.length,
        lastUpdated: new Date()
      }
    });
  } catch (error) {
    console.error('Fetch known harassers error:', error);
    res.status(500).json({
      status: 'error',
      type: 'ServerError',
      message: 'Failed to fetch known harassers'
    });
  }
});

// router.post('/report-user', (req, res) => {//this will fetch generated user report for the user and then we will send it to cyberhelpline

// });

// an ep to review and remove the harraser tag for the user

module.exports = router;