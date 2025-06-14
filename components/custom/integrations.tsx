"use client";

import useParagon, { ParagraphTypes } from "@/lib/paragon/useParagon";
import { CheckedState } from "@radix-ui/react-checkbox";
import { useEffect, useState, useRef } from "react";
import { ChevronDownIcon } from "./icons";

import { Button } from "../ui/button";
import { FunctionTool } from "@/app/(chat)/api/chat/route";

type IntegrationTileProps = {
  integration: {
    icon: string;
    name: string;
    type: string;
  };
  integrationEnabled?: boolean;
  onConnect: () => void;
  tools?: {
    name: string;
    title: string;
  }[];
  actions?: FunctionTool[];
  selectedTools: string[];
  onToolSelectToggle: (name: string, checked: CheckedState) => void;
  onToolSelectAllToggle: (checked: CheckedState) => void;
  setSelectedSource: (source: { name: string, type: string, icon: string }) => void;
};

function IntegrationTile({
  integration,
  integrationEnabled,
  tools = [],
  actions = [],
  selectedTools,
  onConnect,
  onToolSelectAllToggle,
  onToolSelectToggle,
  setSelectedSource,
}: IntegrationTileProps) {
  const [expanded, setExpanded] = useState(false);

  const handleClick = () => {
    if (integrationEnabled) {
      setExpanded((prev) => !prev);
    } else {
      onConnect();
    }
  };

  const triggerSyncPipeline = async (integration: string): Promise<string> => {
    const req = await fetch(`${window.location.host}/api/sync/trigger?integration=${integration}`, {
      headers: {
        "Content-Type": "application/json"
      },
    });
    const res = await req.json();

    return res.message;
  }

  return (
    <div className="w-full mb-2 mr-2 rounded-lg" key={integration.type}>
      <div className="border border-slate-300 dark:border-slate-700 rounded">
        <div
          className="p-4 flex items-center rounded rounded-br-none rounded-bl-none justify-between hover:bg-gray-100 dark:hover:bg-secondary cursor-pointer"
          onClick={integrationEnabled ? () => { setSelectedSource({ name: integration.name, type: integration.type, icon: integration.icon }) } : () => { handleClick() }}
        >
          <div className="flex items-center">
            <img src={integration.icon} className="w-4 h-4 mr-2" />
            <p className="text-sm font-semibold">{integration.name}</p>
          </div>
          <div className="flex items-center">
            <div
              className={`rounded mr-2 p-1 px-2 inline-flex items-center bg-opacity-30 dark:bg-opacity-30 ${integrationEnabled
                ? "bg-green-400 dark:bg-green-400"
                : "bg-slate-200 dark:bg-slate-400"
                }`}
            >
              <div
                className={`rounded-full h-2 w-2 ${integrationEnabled ? "bg-green-500" : "bg-slate-300"
                  } mr-1`}
              />
              <p
                className={`text-xs font-semibold ${integrationEnabled
                  ? "text-green-600 dark:text-green-500"
                  : "text-slate-500 dark:text-slate-300"
                  }`}
              >
                {integrationEnabled ? "Synced" : "Not Synced"}
              </p>
            </div>
            {integrationEnabled ? (
              <div className={expanded ? "bg-muted hover:bg-white text-muted-foreground rounded-full justify-center items-center rotate-180" : "bg-muted hover:bg-white text-muted-foreground rounded-full justify-center items-center"} onClick={handleClick}>
                <ChevronDownIcon size={20} />
              </div>
            ) : null}
          </div>
        </div>
        {expanded ? (
          <div className="border-t p-4 pt-2">
            <p className="text-sm text-muted-foreground">
              x files synced
            </p>
            <div className="flex justify-between flex-row space-x-2">
              <Button
                variant="outline"
                size="sm"
                className="mt-3 text-white bg-indigo-700"
                onClick={() => triggerSyncPipeline(integration.type)}
              >
                Enable Sync
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => onConnect()}
              >
                Configure
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div >
  );
}

export default function Integrations({
  session,
  initialToolsSelected,
  onUpdateTools,
  onUpdateActions,
  setSelectedSourceAction
}: {
  session: { paragonUserToken?: string };
  setSelectedSourceAction: (source: { name: string, type: string, icon: string }) => void;
  initialToolsSelected?: string[];
  onUpdateTools?: (tools: ParagraphTypes[string]) => void;
  onUpdateActions?: (actions: FunctionTool[]) => void;
}) {
  const { user, paragon, actionTypes } = useParagon(
    session.paragonUserToken ?? ""
  );
  const integrations = paragon?.getIntegrationMetadata() ?? [];
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const hasSetInitialSource = useRef(false);

  useEffect(() => {
    if (initialToolsSelected) {
      setSelectedTools(initialToolsSelected);
    }
  }, [initialToolsSelected]);

  useEffect(() => {
    if (user?.authenticated && integrations.length > 0 && !hasSetInitialSource.current) {
      hasSetInitialSource.current = true;
      setSelectedSourceAction({
        name: integrations[0].name,
        type: integrations[0].type,
        icon: integrations[0].icon
      });
    }
  }, [user?.authenticated, integrations.length]);

  useEffect(() => {
    if (onUpdateActions) {
      onUpdateActions(
        selectedTools
          .map((tool) =>
            Object.values(actionTypes)
              .flatMap((v) => v)
              .find((type) => type.function.name === tool)
          )
          .filter((tool) => tool != null)
      );
    }
  }, [selectedTools, actionTypes, onUpdateTools]);

  const handleItemCheck = (id: string, checked: CheckedState) => {
    if (checked === true) {
      setSelectedTools((prev) => [...prev, id]);
    } else {
      setSelectedTools((prev) => prev.filter((item) => item !== id));
    }
  };

  return (
    <div className="pt-3">
      <div className="flex items-center justify-between w-full">
        <h1 className="font-semibold text-sm mt-2 mb-2">Sources</h1>
      </div>
      <div className="flex flex-wrap">
        {user?.authenticated ? (
          integrations
            .sort((a, b) => {
              if (
                user.integrations?.[a.type]?.enabled &&
                !user?.integrations?.[b.type]?.enabled
              ) {
                return -1;
              }
              if (
                user.integrations?.[b.type]?.enabled &&
                !user?.integrations?.[a.type]?.enabled
              ) {
                return 1;
              }
              return a.type < b.type ? -1 : 1;
            })
            .map((integration) => (
              <IntegrationTile
                integration={integration}
                onConnect={() => paragon!.connect(integration.type, {})}
                onToolSelectAllToggle={(checked: CheckedState) => {
                  if (checked === true) {
                    setSelectedTools((prev) => {
                      const set = new Set(prev);
                      actionTypes[integration.type]?.forEach((intent) =>
                        set.add(intent.function.name)
                      );
                      return Array.from(set);
                    });
                  } else {
                    setSelectedTools((prev) => {
                      return prev.filter(
                        (type) =>
                          !actionTypes[integration.type].some(
                            (intent) => intent.function.name === type
                          )
                      );
                    });
                  }
                }}
                onToolSelectToggle={handleItemCheck}
                selectedTools={selectedTools}
                integrationEnabled={
                  user?.authenticated &&
                  user?.integrations?.[integration.type]?.enabled
                }
                key={integration.type}
                actions={actionTypes[integration.type]}
                setSelectedSource={setSelectedSourceAction}
              />
            ))
        ) : (
          <LoadingSkeleton />
        )}
      </div>
    </div>
  );
}

export const LoadingSkeleton = () => {
  return Array(5)
    .fill(null)
    .map((_, i) => (
      <div
        className={`w-full mb-2 mr-2 rounded-lg cursor-pointer animate-pulse`}
        key={i}
      >
        <div className="border border-slate-300 dark:border-slate-700 rounded p-4">
          <div className="flex items-center mb-1">
            <div className="inline w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-500 mr-2" />
            <div className="inline rounded-full w-48 h-2 bg-slate-200 dark:bg-slate-500" />
          </div>
        </div>
      </div>
    ));
};

function formatString(input: string): string {
  const parts = input.split("_").slice(1);

  const shouldKeepCapitalized = (part: string): boolean => {
    return part === "ID" || part.endsWith("QL");
  };

  const formattedParts = parts.map((part) => {
    if (shouldKeepCapitalized(part)) {
      return part;
    }
    return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
  });

  return formattedParts.join(" ");
}
