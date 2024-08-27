const asyncHandler = (requestHandler) => {
    return (req, res, next) => {
         Promise.resolve(requestHandler(req, res, next))
                .catch((err) => next(err)); // Only call next(err) if there's an error
     }
 };
 
 export { asyncHandler };
 