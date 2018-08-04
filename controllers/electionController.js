const Election = require('../models/Election');
const User = require('../models/UserModel');
const {
	DuplicateElectionError, UnknownElectionError, WrongPropertiesError,
} = require('../common/errors');

const { votingRole } = require('../config.json');

module.exports.listElections = (req, res, next) => (
	Election.find({}, '-_id -__v -remainingVoters -polls')
		.then(polls => res.json(polls))
		.catch(e => next(e))
);

module.exports.addElection = (req, res, next) => (
	User.find({ roles: votingRole })
		.distinct('_id') // Return an array of ids, rather than objects
		.then(userIds => (
			Election.create({ remainingVoters: userIds, ...req.body })
		))
		.then(election => res.json(election))
		.catch((e) => {
			// E11000 is Mongo's error for duplicate key
			if (e.code === 11000) return next(new DuplicateElectionError());

			return next(e);
		})
);

module.exports.updateElection = (req, res, next) => (
	Election.update({ name: req.params.electionName }, req.body)
		.then((result) => {
			// Make sure that at least one of the provided fields was valid
			if (result.ok === 0) throw new WrongPropertiesError();
			// Check if any Elections were updated after the operation
			if (result.n === 0) throw new UnknownElectionError();

			// The backend doesn't complain if the Election existed but it
			// didn't suffer any modifications at all, it just accepts the
			// request and leaves the object unmutated

			return res.sendStatus(200);
		})
		.catch(e => next(e))
);

module.exports.deleteElection = (req, res, next) => (
	Election.deleteOne({ name: req.params.electionName })
		.then((result) => {
			// Check if any Elections were deleted after the operation
			if (result.n === 0) throw new UnknownElectionError();

			return res.sendStatus(200);
		})
		.catch(e => next(e))
);