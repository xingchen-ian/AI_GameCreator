import type { Question } from "@/lib/protocol/stages";

const starterPrompts = [
  "先不用急着把它想成游戏。找一件你熟悉、其中又总有变化或需要做决定的事情。你脑中最先出现的是哪个画面？",
  "我们先把这段经历像录像一样回放。它从什么信号开始？接着你做了什么？最后怎样才算结束？",
  "回忆一下身体和情绪发生变化的瞬间：什么时候你会紧张、犹豫、专注，或者突然松一口气？",
  "哪些环节不能只是等它发生，而需要你观察情况、做决定或立刻行动？",
];

export function starterForQuestion(question: Question) {
  const index = Number(question.id.slice(1)) - 1;
  return index < starterPrompts.length
    ? starterPrompts[index]
    : `${question.guide} 先说说你现在最直觉的想法；我只围绕当前问题追问，其他想法会先放进“稍后讨论”。`;
}
