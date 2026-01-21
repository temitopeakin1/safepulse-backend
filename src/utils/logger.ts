type LogParams = unknown[];

const logger = {
  info: (...params: LogParams): void => {
    console.log(...params);
  },

  error: (...params: LogParams): void => {
    console.error(...params);
  },
};

export default logger;
