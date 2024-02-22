figma.showUI(__html__, { width: 400, height: 540 });

const differenceRectangleIdList = [];

const CONSTANTS = {
  MODIFIED_FILLS: {
    type: "SOLID",
    color: { r: 0.976, g: 0.407, b: 0.329 },
  },
  NEW_FILLS: {
    type: "SOLID",
    color: { r: 0.435, g: 0.831, b: 0.505 },
  },
  RECT_OPACITY: 0.2,
  MIN_SIZE_VALUE: 1,
  TIME_GAP_MS: 9 * 60 * 60 * 1000,
};

const isOwnProperty = (targetObject, targetProperty) => {
  return Object.prototype.hasOwnProperty.call(targetObject, targetProperty);
};

const renderDifferenceRectangle = (differences, modifiedFrames) => {
  for (const nodeId in differences) {
    if (isOwnProperty(differences, nodeId)) {
      const modifiedNode = differences[nodeId];
      const { type, differenceInformation, frameId } = modifiedNode;
      const { x, y, width, height } = modifiedNode.position;

      const differenceRectangle = figma.createRectangle();

      differenceRectangle.name = "Difference Rectangle Node";
      differenceRectangle.resize(
        width || CONSTANTS.MIN_SIZE_VALUE,
        height || CONSTANTS.MIN_SIZE_VALUE,
      );
      differenceRectangle.x = x;
      differenceRectangle.y = y;
      differenceRectangle.opacity = CONSTANTS.RECT_OPACITY;

      switch (type) {
        case "NEW":
          differenceRectangle.fills = [CONSTANTS.NEW_FILLS];
          differenceRectangle.setPluginData(
            "differenceInformation",
            "이전 버전엔 없던 새로운 요소에요!",
          );

          break;
        case "MODIFIED":
          differenceRectangle.fills = [CONSTANTS.MODIFIED_FILLS];
          differenceRectangle.setPluginData(
            "differenceInformation",
            JSON.stringify(differenceInformation),
          );

          break;
        default:
          break;
      }

      differenceRectangleIdList.push(differenceRectangle.id);
      modifiedFrames[frameId].isNew = false;
    }
  }

  for (const frameId in modifiedFrames) {
    if (isOwnProperty(modifiedFrames, frameId)) {
      if (modifiedFrames[frameId].isNew) {
        const differenceRectangle = figma.createRectangle();
        const { x, y, width, height } = modifiedFrames[frameId];

        differenceRectangle.resize(width, height);
        differenceRectangle.x = x;
        differenceRectangle.y = y;
        differenceRectangle.fills = [CONSTANTS.NEW_FILLS];
        differenceRectangle.opacity = CONSTANTS.RECT_OPACITY;
        differenceRectangle.setPluginData(
          "differenceInformation",
          "이전 버전엔 없던 새로운 프레임이에요!",
        );

        differenceRectangleIdList.push(differenceRectangle.id);
      }
    }
  }
};

const clearRectangleNode = () => {
  differenceRectangleIdList.forEach(rectangleNodeId => {
    const rectangleNode = figma.getNodeById(rectangleNodeId);

    rectangleNode.remove();
  });

  differenceRectangleIdList.length = 0;
};

const formatTime = dateString => {
  const currentDate = new Date(dateString);
  const utcMS =
    currentDate.getTime() + currentDate.getTimezoneOffset() * 60 * 1000;

  const koreaTime = new Date(utcMS + CONSTANTS.TIME_GAP_MS);

  const year = koreaTime.getFullYear();
  const month = koreaTime.getMonth();
  const date = koreaTime.getDate();

  const hour = koreaTime.getHours();
  const AmPm = hour >= 12 ? "PM" : "AM";
  const formattedHour = hour % 12 || 12;
  const minutes =
    koreaTime.getMinutes() < 10
      ? `0${koreaTime.getMinutes()}`
      : koreaTime.getMinutes();

  const formattedDate = `${year}-${month}-${date}`;
  const formattedTime = `${formattedHour}:${minutes} ${AmPm}`;

  return { formattedDate, formattedTime };
};

figma.ui.onmessage = async message => {
  if (message.type === "SAVE_ACCESS_TOKEN") {
    await figma.clientStorage.setAsync("accessToken", message.content);
  }

  if (message.type === "GET_ACCESS_TOKEN") {
    const accessToken = await figma.clientStorage.getAsync("accessToken");

    figma.ui.postMessage({
      type: "GET_ACCESS_TOKEN",
      content: accessToken,
    });
  }

  if (message.type === "GET_PROJECT_KEY") {
    const projectKey = figma.fileKey;

    figma.ui.postMessage({
      type: "GET_PROJECT_KEY",
      content: projectKey,
    });
  }

  if (message.type === "GET_CURRENT_PAGE_ID") {
    const currentPageId = figma.currentPage.id;

    figma.ui.postMessage({
      type: "GET_CURRENT_PAGE_ID",
      content: currentPageId,
    });
  }

  if (message.type === "GET_NEW_VERSION_ID") {
    const currentDateString = new Date().toISOString();
    const { formattedTime: createdTime } = formatTime(currentDateString);

    const newVersionId = await figma.saveVersionHistoryAsync(createdTime);

    figma.ui.postMessage({
      type: "GET_NEW_VERSION_ID",
      content: newVersionId,
    });
  }

  if (message.type === "POST_DIFFING_RESULT") {
    const { differences, modifiedFrames } = message.content;

    clearRectangleNode();

    renderDifferenceRectangle(differences, modifiedFrames);
  }
};

figma.on("selectionchange", () => {
  const selectedNode = figma.currentPage.selection[0];

  if (!selectedNode) {
    return;
  }

  if (differenceRectangleIdList.includes(selectedNode.id)) {
    const differenceInformation = selectedNode.getPluginData(
      "differenceInformation",
    );

    figma.ui.postMessage({
      type: "RENDER_DIFFERENCE_INFORMATION",
      content: { differenceInformation },
    });
  } else {
    figma.ui.postMessage({
      type: "RENDER_DIFFERENCE_INFORMATION",
      content: "UNCHANGED_NODE",
    });
  }
});

figma.on("currentpagechange", () => {
  const currentPageId = figma.currentPage.id;

  clearRectangleNode();

  figma.ui.postMessage({
    type: "CHANGED_CURRENT_PAGE_ID",
    content: currentPageId,
  });
});

figma.on("close", () => {
  clearRectangleNode();

  figma.closePlugin();
});
