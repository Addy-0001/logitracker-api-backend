const Job = require('../models/job.model');
const User = require('../models/user.model');

// Log resolved path and schema
console.log('Job model resolved from:', require.resolve('../models/job.model'));
console.log('Job model jobDetails type in controller:', Job.schema.paths.jobDetails.instance);

exports.getJobs = async (req, res) => {
    try {
        console.log('getJobs called with query:', req.query);
        console.log('req.user:', req.user);

        const { status, priority, search } = req.query;
        const query = {};

        // Removed assignedTo filter to fetch all jobs
        console.log('Fetching all jobs, ignoring assignedTo');

        if (status) {
            query.status = status;
            console.log('Filtering by status:', status);
        }

        // Adjust priority filter for jobDetails as string
        if (priority) {
            query.jobDetails = { $regex: `"priority":"${priority}"`, $options: 'i' };
            console.log('Filtering by priority:', priority);
        }

        if (search) {
            const regex = new RegExp(search, 'i');
            query.$or = [
                { 'customer.name': regex },
                { 'pickup.city': regex },
                { 'pickup.state': regex },
                { 'delivery.city': regex },
                { 'delivery.state': regex }
            ];
            console.log('Filtering by search:', search);
        }

        console.log('Executing query:', query);
        const jobs = await Job.find(query).sort({ createdAt: -1 }).lean();
        console.log('Fetched jobs:', jobs.length, jobs);

        res.status(200).json(jobs);
    } catch (err) {
        console.error('Error fetching jobs:', err.message, err.stack);
        res.status(500).json({ message: 'Failed to fetch jobs', error: err.message });
    }
};

exports.createJob = async (req, res) => {
    try {
        console.log('createJob called with body:', req.body);
        const { assignedTo } = req.body;

        console.log('Validating assignedTo:', assignedTo);
        const user = await User.findById(assignedTo);
        if (!user || user.role !== 'driver') {
            console.log('Invalid user:', user);
            return res.status(400).json({ message: 'Invalid or non-driver user assigned' });
        }

        console.log('Request body jobDetails:', req.body.jobDetails);
        console.log('jobDetails type:', typeof req.body.jobDetails);

        const jobData = { ...req.body, assignedTo };
        console.log('Creating job with data:', jobData);

        const job = await Job.create(jobData);
        console.log('Created job:', job);

        const jobResponse = job.toJSON ? job.toJSON() : job;
        console.log('Sending response:', jobResponse);

        res.status(201).json(jobResponse);
    } catch (err) {
        console.error('Error creating job:', err.message, err.stack);
        res.status(400).json({ message: 'Failed to create job', error: err.message });
    }
};

exports.getSummary = async (req, res) => {
    try {
        console.log('Fetching summary for all jobs');

        const [inTransit, pending, urgent, deliveredToday] = await Promise.all([
            Job.countDocuments({ status: 'in-transit' }),
            Job.countDocuments({ status: 'pending' }),
            Job.countDocuments({ jobDetails: { $regex: '"priority":"high"', $options: 'i' } }),
            Job.countDocuments({
                createdAt: { $gte: new Date().setHours(0, 0, 0, 0) }
            })
        ]);

        console.log('Summary stats:', { inTransit, pending, urgent, deliveredToday });
        res.json({
            inTransit,
            pending,
            urgent,
            deliveredToday
        });
    } catch (err) {
        console.error('Error fetching summary:', err.message, err.stack);
        res.status(500).json({ message: 'Failed to fetch summary', error: err.message });
    }
};

exports.getJobById = async (req, res) => {
    try {
        console.log('getJobById called with id:', req.params.id);
        const job = await Job.findOne({ _id: req.params.id }).lean();
        if (!job) {
            console.log('Job not found');
            return res.status(404).json({ message: 'Job not found' });
        }
        console.log('Fetched job:', job);
        res.json(job);
    } catch (err) {
        console.error('Error fetching job:', err.message, err.stack);
        res.status(500).json({ message: 'Error fetching job', error: err.message });
    }
};