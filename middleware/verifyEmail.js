const verifyEmail = (req, res, next) => {
    if(req.query?.email !== req.user.email) {
        return res.status(403).send({ message: "Forbidden access"})
    }

    next()
};

module.exports = verifyEmail;