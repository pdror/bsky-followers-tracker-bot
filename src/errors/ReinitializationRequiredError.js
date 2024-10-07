class ReinitializationRequiredError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ReinitializationRequiredError';
    }
}

export default ReinitializationRequiredError;