// src/components/pdf-viewer-component.jsx
import { useEffect, useRef } from "react";

export default function PdfViewerComponent(props) {
  const containerRef = useRef(null);
  const instanceRef = useRef(null);
  const sidebarContainerRef = useRef(null);

  const TobeRedacted = `[
  {
    "pageindex": 0,
    "boundingbox": {
      "left": 73.24800109863281,
      "top": 128.55975341796875,
      "width": 82.42578125,
      "height": 33.17578125
    }
  },
  {
    "pageindex": 0,
    "boundingbox": {
      "left": 436.84443969726567,
      "top": 685.4532470703125,
      "width": 47.09062499999999,
      "height": 15.311718749999955
    }
  },
  {
    "pageindex": 1,
    "boundingbox": {
      "left": 416.52562713623047,
      "top": 266.8126220703125,
      "width": 37.33281249999999,
      "height": 15.846875000000011
    }
  },
  {
    "pageindex": 1,
    "boundingbox": {
      "left": 399.13099670410156,
      "top": 562.6055908203125,
      "width": 64.23281250000002,
      "height": 15.600000000000023
    }
  }
]`;

  // function to extract text under redaction area
  const extractTextFromRedaction = async (instance, pageIndex, boundingBox) => {
    try {
      // get text lines for the page
      const textLines = await instance.textLinesForPageIndex(pageIndex);

      // filter text lines that intersect with the redaction bounding box
      const intersectingText = textLines
        .filter((textLine) => {
          // check if text line intersects with redaction area
          const textBounds = textLine.boundingBox;
          return !(
            textBounds.left > boundingBox.left + boundingBox.width ||
            textBounds.left + textBounds.width < boundingBox.left ||
            textBounds.top > boundingBox.top + boundingBox.height ||
            textBounds.top + textBounds.height < boundingBox.top
          );
        })
        .map((textLine) => textLine.contents)
        .join(" ");

      return intersectingText.trim();
    } catch (error) {
      console.error("Error extracting text:", error);
      return "";
    }
  };

  // function to fetch all redaction annotations from all pages
  const fetchAllRedactions = async (instance) => {
    const pageCount = await instance.totalPageCount;
    const allRedactions = [];

    for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
      const annotations = await instance.getAnnotations(pageIndex);
      const redactionAnnotations = annotations.filter(
        (annotation) =>
          annotation instanceof
          window.NutrientViewer.Annotations.RedactionAnnotation,
      );

      for (const annotation of redactionAnnotations) {
        // extract the actual text being redacted
        const extractedText = await extractTextFromRedaction(
          instance,
          pageIndex,
          annotation.boundingBox,
        );

        allRedactions.push({
          id: annotation.id,
          pageIndex: pageIndex,
          boundingBox: annotation.boundingBox,
          rects: annotation.rects,
          text: extractedText || `Redacted content on page ${pageIndex + 1}`,
        });
      }
    }
    console.log("All Redactions:", allRedactions);
    return allRedactions;
  };

  // function to handle redaction click and jump to its location
  const handleRedactionClick = async (redaction) => {
    const instance = instanceRef.current;
    if (!instance) return;

    // set the current page to where the redaction is
    await instance.setViewState((viewState) =>
      viewState.set("currentPageIndex", redaction.pageIndex),
    );

    // jump to the redaction's bounding box
    instance.jumpToRect(redaction.pageIndex, redaction.boundingBox);

    // optionally highlight the annotation
    await instance.setSelectedAnnotation(redaction.id);
  };

  // function to reject/remove a redaction
  const rejectRedaction = async (redaction) => {
    const instance = instanceRef.current;
    if (!instance) return;

    try {
      // find and delete the annotation
      const annotations = await instance.getAnnotations(redaction.pageIndex);
      const annotationToDelete = annotations.find((a) => a.id === redaction.id);

      if (annotationToDelete) {
        await instance.delete(annotationToDelete);
      }

      // update sidebar
      await updateSidebarContent();
    } catch (error) {
      console.error("Error rejecting redaction:", error);
    }
  };

  // function to update sidebar content dynamically
  const updateSidebarContent = async () => {
    const instance = instanceRef.current;
    if (!instance || !sidebarContainerRef.current) return;

    const redactions = await fetchAllRedactions(instance);
    const container = sidebarContainerRef.current;

    // clear existing content
    container.innerHTML = "";

    // create header
    const header = document.createElement("div");
    header.style.padding = "16px";
    header.style.backgroundColor = "#fff";
    header.style.borderBottom = "1px solid #e0e0e0";
    header.style.flexShrink = "0";

    const titleRow = document.createElement("div");
    titleRow.style.display = "flex";
    titleRow.style.justifyContent = "space-between";
    titleRow.style.alignItems = "center";
    titleRow.style.marginBottom = "8px";

    const title = document.createElement("h3");
    title.textContent = "Marked for Redaction";
    title.style.margin = "0";
    title.style.fontSize = "16px";
    title.style.fontWeight = "600";
    title.style.color = "#333";
    titleRow.appendChild(title);

    const count = document.createElement("div");
    count.textContent = `${redactions.length} item${redactions.length !== 1 ? "s" : ""}`;
    count.style.fontSize = "12px";
    count.style.color = "#666";
    titleRow.appendChild(count);

    header.appendChild(titleRow);

    // add "Apply All Redactions" button
    if (redactions.length > 0) {
      const applyAllBtn = document.createElement("button");
      applyAllBtn.textContent = "Apply All Redactions";
      applyAllBtn.style.width = "100%";
      applyAllBtn.style.padding = "8px 12px";
      applyAllBtn.style.fontSize = "13px";
      applyAllBtn.style.fontWeight = "500";
      applyAllBtn.style.backgroundColor = "#28a745";
      applyAllBtn.style.color = "#fff";
      applyAllBtn.style.border = "none";
      applyAllBtn.style.borderRadius = "4px";
      applyAllBtn.style.cursor = "pointer";
      applyAllBtn.style.transition = "background-color 0.2s";
      applyAllBtn.style.marginTop = "12px";

      applyAllBtn.addEventListener("mouseenter", () => {
        applyAllBtn.style.backgroundColor = "#218838";
      });

      applyAllBtn.addEventListener("mouseleave", () => {
        applyAllBtn.style.backgroundColor = "#28a745";
      });

      applyAllBtn.addEventListener("click", async () => {
        try {
          await instance.applyRedactions();
          await updateSidebarContent();
        } catch (error) {
          console.error("Error applying all redactions:", error);
        }
      });

      header.appendChild(applyAllBtn);
    }

    container.appendChild(header);

    // create scrollable content area
    const contentWrapper = document.createElement("div");
    contentWrapper.style.flex = "1";
    contentWrapper.style.overflowY = "auto";
    contentWrapper.style.padding = "8px";

    // create redactions list
    if (redactions.length === 0) {
      const emptyMessage = document.createElement("div");
      emptyMessage.textContent = "No redactions found";
      emptyMessage.style.textAlign = "center";
      emptyMessage.style.color = "#999";
      emptyMessage.style.marginTop = "40px";
      emptyMessage.style.fontSize = "14px";
      contentWrapper.appendChild(emptyMessage);
    } else {
      const list = document.createElement("div");
      list.style.display = "flex";
      list.style.flexDirection = "column";
      list.style.gap = "4px";

      redactions.forEach((redaction) => {
        const item = document.createElement("div");
        item.style.padding = "10px 12px";
        item.style.backgroundColor = "#fff";
        item.style.borderRadius = "4px";
        item.style.cursor = "pointer";
        item.style.transition = "all 0.2s ease";
        item.style.border = "1px solid transparent";
        item.style.position = "relative";

        // hover effect
        item.addEventListener("mouseenter", () => {
          item.style.backgroundColor = "#f0f0f0";
          item.style.borderColor = "#d0d0d0";
        });

        item.addEventListener("mouseleave", () => {
          item.style.backgroundColor = "#fff";
          item.style.borderColor = "transparent";
        });

        // create content wrapper
        const contentDiv = document.createElement("div");
        contentDiv.style.cursor = "pointer";

        // click handler for content
        contentDiv.addEventListener("click", () => {
          handleRedactionClick(redaction);
        });

        // page number
        const pageLabel = document.createElement("div");
        pageLabel.textContent = `Page ${redaction.pageIndex + 1}`;
        pageLabel.style.fontSize = "11px";
        pageLabel.style.color = "#888";
        pageLabel.style.marginBottom = "4px";
        pageLabel.style.fontWeight = "500";
        contentDiv.appendChild(pageLabel);

        // redacted text
        const text = document.createElement("div");
        text.textContent = redaction.text || "No text available";
        text.style.fontSize = "13px";
        text.style.color = "#333";
        text.style.lineHeight = "1.4";
        text.style.overflow = "hidden";
        text.style.textOverflow = "ellipsis";
        text.style.display = "-webkit-box";
        text.style.webkitLineClamp = "3";
        text.style.webkitBoxOrient = "vertical";
        contentDiv.appendChild(text);

        item.appendChild(contentDiv);

        // add remove button
        const buttonContainer = document.createElement("div");
        buttonContainer.style.display = "flex";
        buttonContainer.style.marginTop = "8px";
        buttonContainer.style.paddingTop = "8px";
        buttonContainer.style.borderTop = "1px solid #e0e0e0";

        // remove button (renamed from reject)
        const removeBtn = document.createElement("button");
        removeBtn.textContent = "Remove";
        removeBtn.style.width = "100%";
        removeBtn.style.padding = "4px 8px";
        removeBtn.style.fontSize = "12px";
        removeBtn.style.backgroundColor = "#dc3545";
        removeBtn.style.color = "#fff";
        removeBtn.style.border = "none";
        removeBtn.style.borderRadius = "3px";
        removeBtn.style.cursor = "pointer";
        removeBtn.style.transition = "background-color 0.2s";

        removeBtn.addEventListener("mouseenter", () => {
          removeBtn.style.backgroundColor = "#c82333";
        });

        removeBtn.addEventListener("mouseleave", () => {
          removeBtn.style.backgroundColor = "#dc3545";
        });

        removeBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          rejectRedaction(redaction);
        });

        buttonContainer.appendChild(removeBtn);
        item.appendChild(buttonContainer);

        list.appendChild(item);
      });

      contentWrapper.appendChild(list);
    }

    container.appendChild(contentWrapper);
  };

  useEffect(() => {
    const container = containerRef.current;
    let instance = null;

    const loadPdf = async () => {
      const { NutrientViewer } = window;
      if (container && NutrientViewer) {
        try {
          // store instance reference for tooltip callback
          let currentInstance = null;

          instance = await NutrientViewer.load({
            licenseKey: import.meta.env.VITE_lkey,
            container,
            document: props.document,
            enableAutomaticLinkExtraction: true,
            // define tooltip callback inline with proper closure
            annotationTooltipCallback: (annotation) => {
              if (
                annotation instanceof
                  window.NutrientViewer.Annotations.RedactionAnnotation &&
                currentInstance
              ) {
                return [
                  {
                    type: "custom",
                    title: "Remove",
                    id: "tooltip-remove-annotation",
                    className: "tooltip-item-remove",
                    onPress: async () => {
                      await currentInstance.delete(annotation);

                      // update sidebar
                      setTimeout(() => {
                        updateSidebarContent();
                      }, 100);
                    },
                  },
                ];
              }
              return [];
            },
            toolbarItems: [
              ...NutrientViewer.defaultToolbarItems,
              { type: "content-editor" },
            ],
            ui: {
              sidebar: {
                redactionSidebar: () => ({
                  render: () => {
                    // create the main container
                    const mainContainer = document.createElement("div");
                    mainContainer.style.height = "100%";
                    mainContainer.style.display = "flex";
                    mainContainer.style.flexDirection = "column";
                    mainContainer.style.backgroundColor = "#f7f7f7";

                    // store reference to container
                    sidebarContainerRef.current = mainContainer;

                    // initial content will be updated after instance is ready
                    setTimeout(() => {
                      updateSidebarContent();
                    }, 100);

                    return mainContainer;
                  },
                }),
              },
            },
          });

          // set the current instance for tooltip callback
          currentInstance = instance;

          console.log("Nutrient Viewer loaded successfully", instance);
          instanceRef.current = instance;

          // define custom toolbar item for redaction sidebar
          const redactionSidebarToolbarItem = {
            type: "custom",
            id: "redaction-sidebar-toolbar-item",
            title: "Marked for Redaction",
            dropdownGroup: "sidebar",
            icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M6.5 10C7.32843 10 8 9.32843 8 8.5C8 7.67157 7.32843 7 6.5 7C5.67157 7 5 7.67157 5 8.5C5 9.32843 5.67157 10 6.5 10ZM6.5 15C7.32843 15 8 14.3284 8 13.5C8 12.6716 7.32843 12 6.5 12C5.67157 12 5 12.6716 5 13.5C5 14.3284 5.67157 15 6.5 15ZM6.5 20C7.32843 20 8 19.3284 8 18.5C8 17.6716 7.32843 17 6.5 17C5.67157 17 5 17.6716 5 18.5C5 19.3284 5.67157 20 6.5 20ZM10 7.5H19V9.5H10V7.5ZM10 12.5H19V14.5H10V12.5ZM10 17.5H19V19.5H10V17.5Z"></path></svg>',
            onPress: () => {
              const currentMode = instance.viewState.sidebarMode;
              const newMode =
                currentMode === "redactionSidebar" ? null : "redactionSidebar";

              instance.setViewState((viewState) =>
                viewState.set("sidebarMode", newMode),
              );

              // update content when opening the sidebar
              if (newMode === "redactionSidebar") {
                setTimeout(() => {
                  updateSidebarContent();
                }, 50);
              }
            },
          };

          // add the custom toolbar item
          instance.setToolbarItems([
            ...NutrientViewer.defaultToolbarItems,
            { type: "content-editor" },
            redactionSidebarToolbarItem,
          ]);

          // show signature validation status
          instance.setViewState((viewState) =>
            viewState.set(
              "showSignatureValidationStatus",
              window.NutrientViewer.ShowSignatureValidationStatusMode.IF_SIGNED,
            ),
          );

          // create redaction annotations from TobeRedacted JSON
          const createRedactionsFromJSON = async () => {
            try {
              const redactionData = JSON.parse(TobeRedacted);
              const annotationsToCreate = [];

              for (const item of redactionData) {
                const { pageindex, boundingbox } = item;

                // create a rect from the bounding box
                const rect = new window.NutrientViewer.Geometry.Rect({
                  left: boundingbox.left,
                  top: boundingbox.top,
                  width: boundingbox.width,
                  height: boundingbox.height,
                });

                // create a RedactionAnnotation with rects property
                const redactionAnnotation =
                  new window.NutrientViewer.Annotations.RedactionAnnotation({
                    pageIndex: pageindex,
                    boundingBox: rect,
                    rects: window.NutrientViewer.Immutable.List([rect]),
                  });

                annotationsToCreate.push(redactionAnnotation);
              }

              // create all annotations at once
              if (annotationsToCreate.length > 0) {
                await instance.create(annotationsToCreate);
                console.log(
                  `Created ${annotationsToCreate.length} redaction annotations from JSON`,
                );
              }
            } catch (error) {
              console.error("Error creating redactions from JSON:", error);
            }
          };

          // call the function to create redactions
          await createRedactionsFromJSON();

          // listen for annotation changes
          instance.addEventListener("annotations.change", async () => {
            console.log("Annotations changed, updating sidebar...");
            // update sidebar content if it's currently showing
            const viewState = instance.viewState;
            if (viewState.sidebarMode === "redactionSidebar") {
              await updateSidebarContent();
            }
          });

          // listen for annotation creation
          instance.addEventListener(
            "annotations.create",
            async (annotation) => {
              console.log("Annotation created:", annotation);
              if (
                annotation instanceof
                window.NutrientViewer.Annotations.RedactionAnnotation
              ) {
                const viewState = instance.viewState;
                if (viewState.sidebarMode === "redactionSidebar") {
                  await updateSidebarContent();
                }
              }
            },
          );

          // listen for annotation deletion
          instance.addEventListener("annotations.delete", async () => {
            console.log("Annotation deleted, updating sidebar...");
            const viewState = instance.viewState;
            if (viewState.sidebarMode === "redactionSidebar") {
              await updateSidebarContent();
            }
          });

          // optionally open the redaction sidebar by default
          instance.setViewState((viewState) =>
            viewState
              .set("showSidebar", true)
              .set("sidebarMode", "redactionSidebar"),
          );

          // initial update after everything is loaded
          setTimeout(() => {
            updateSidebarContent();
          }, 500);
        } catch (error) {
          console.error("Error loading Nutrient Viewer:", error);
        }
      }
    };

    loadPdf();

    return () => {
      if (container && window.NutrientViewer) {
        window.NutrientViewer.unload(container);
      }
    };
  }, [props.document]);

  return <div ref={containerRef} style={{ width: "100%", height: "100vh" }} />;
}
