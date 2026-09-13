"use client";
import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Volume2, VolumeX, Send, Bot, User, Square, Loader2 } from "lucide-react";
import type { ChatMessage, ChatResponseBody, SpeechRecognition } from "@/types";
import PageHeader from "@/components/PageHeader";
import AIConsent, { useAIConsent } from "@/components/AIConsent";
import SaveToCase from "@/components/SaveToCase";
import { readAIResponse } from "@/lib/ai-client";
const SUGGESTIONS = ["Help me understand a legal notice", "What should I ask an advocate?", "How can I find free legal aid?"];
export default function VoiceAssistantPage() {
  const ai = useAIConsent();
  const [input,setInput] = useState("");
  const [messages,setMessages] = useState<ChatMessage[]>([]);
  const [busy,setBusy] = useState(false);
  const [listening,setListening] = useState(false);
  const [speaking,setSpeaking] = useState(false);
  const [speechSupported,setSpeechSupported] = useState(false);
  const [error,setError] = useState("");
  const [partial,setPartial] = useState("");
  const [language,setLanguage] = useState("en-IN");
  const [demoConversation,setDemoConversation] = useState(false);
  const recognition = useRef<SpeechRecognition | null>(null);
  const pending = useRef<AbortController | null>(null);
  const scroll = useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const browser = window as unknown as {SpeechRecognition?:new()=>SpeechRecognition;webkitSpeechRecognition?:new()=>SpeechRecognition};
    const Constructor = browser.SpeechRecognition || browser.webkitSpeechRecognition;
    if(Constructor) {
      const engine = new Constructor(); engine.lang=language; engine.continuous=false; engine.interimResults=true;
      engine.onstart=()=>setListening(true); engine.onend=()=>setListening(false);
      engine.onresult=event=>setInput(Array.from({length:event.results.length},(_,i)=>event.results[i][0].transcript).join(" "));
      engine.onerror=event=>{setListening(false);if(event.error!=="aborted")setError("Voice input is unavailable. Check microphone permission or type your question.");};
      recognition.current=engine; setSpeechSupported(true);
    }
    return ()=>{recognition.current?.abort();recognition.current=null;};
  },[language]);
  useEffect(()=>()=>{pending.current?.abort();window.speechSynthesis?.cancel();},[]);
  useEffect(()=>{scroll.current?.scrollTo({top:scroll.current.scrollHeight});},[messages,partial]);
  async function send(content:string) {
    const text=content.trim(); if(!text||pending.current||!ai.ready)return;
    const controller=new AbortController(); pending.current=controller;setBusy(true);setError("");setPartial("");
    if(ai.mode==='demo')setDemoConversation(true);
    try {
      const response=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:text,history:messages.slice(-10),persona:'citizen',stream:true,...ai.requestOptions}),signal:controller.signal});
      const result=await readAIResponse<ChatResponseBody>(response,delta=>setPartial(value=>value+delta),()=>{});
      setMessages(previous=>[...previous,{role:'user',content:text},{role:'assistant',content:result.reply}]);setInput("");setPartial("");
    } catch(failure) {setError(controller.signal.aborted?"Stopped. Your question and any partial response are kept below.":failure instanceof Error?failure.message:"The assistant is unavailable. Your question is still here.");}
    finally{pending.current=null;setBusy(false);}
  }
  function speak(text:string) {
    if(!('speechSynthesis' in window)){setError('Read-aloud is not supported in this browser.');return;}
    window.speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(text);utterance.lang=language;utterance.rate=.95;
    const voice=window.speechSynthesis.getVoices().find(item=>item.lang===language);if(voice)utterance.voice=voice;
    utterance.onstart=()=>setSpeaking(true);utterance.onend=()=>setSpeaking(false);utterance.onerror=()=>setSpeaking(false);window.speechSynthesis.speak(utterance);
  }
  return <div className="workspace-page"><PageHeader eyebrow="Citizen tools" title="Let’s talk it through." description="Ask a question in your own words. Type, or use your microphone and review the transcript before sending."/><div className="mx-auto max-w-3xl space-y-5"><AIConsent value={ai}/><div className="card-surface overflow-hidden"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-navy-200 p-4"><span className="flex items-center gap-2 text-sm font-semibold"><Bot size={19}/>Justice AI assistant</span><label className="text-xs text-navy-500 flex items-center gap-2">Voice language<select aria-label="Voice language" value={language} onChange={e=>setLanguage(e.target.value)} className="border border-navy-200 rounded-lg p-2"><option value="en-IN">English (India)</option><option value="hi-IN">Hindi</option></select></label></div>
    <div ref={scroll} className="min-h-[280px] max-h-[52vh] overflow-y-auto p-5 space-y-5" aria-live="polite" aria-relevant="additions text">{messages.length===0&&!partial&&<div className="py-10 text-center"><span className="tool-icon"><MessageIcon/></span><h2 className="mt-4 text-lg font-semibold">What would you like to understand?</h2><p className="text-sm text-navy-500 mt-2">You can start with a question. No legal terminology needed.</p></div>}{messages.map((message,i)=><div key={i} className={`flex gap-3 ${message.role==='user'?'justify-end':''}`}><span className="mt-1 shrink-0 text-navy-400">{message.role==='assistant'?<Bot size={18}/>:<User size={18}/>}</span><div className={`max-w-[88%] rounded-xl p-3 text-sm leading-7 whitespace-pre-wrap break-words ${message.role==='user'?'bg-navy-100':'bg-white'}`}>{message.content}{message.role==='assistant'&&<button className="mt-2 block text-navy-500" onClick={()=>speak(message.content)} aria-label="Read this response aloud"><Volume2 size={16}/></button>}</div></div>)}{partial&&<div className="text-sm whitespace-pre-wrap leading-7 border-l-2 border-gold-400 pl-4"><p className="text-xs text-navy-500 mb-2">{busy?'Responding…':'Incomplete response · not saved'}</p>{partial}</div>}{busy&&!partial&&<p className="flex items-center gap-2 text-sm text-navy-500"><Loader2 size={16} className="animate-spin"/>Waiting for a response…</p>}</div>
    {messages.length===0&&<div className="flex flex-wrap gap-2 p-4 border-t border-navy-100">{SUGGESTIONS.map(s=><button key={s} className="rounded-lg bg-navy-50 px-3 py-2 text-xs text-navy-600" onClick={()=>setInput(s)}>{s}</button>)}</div>}
    <form onSubmit={e=>{e.preventDefault();void send(input);}} className="p-4 border-t border-navy-200"><label htmlFor="voice-question" className="sr-only">Your question</label><textarea id="voice-question" value={input} onChange={e=>setInput(e.target.value)} placeholder={listening?'Listening…':'Type your question…'} rows={2} className="input-field w-full resize-y"/><div className="flex justify-between items-center gap-3 mt-3"><div className="flex items-center gap-2"><button type="button" disabled={!speechSupported||busy} onClick={()=>{if(listening)recognition.current?.stop();else {setError('');try{recognition.current?.start();}catch{setError('Microphone is already active.');}}}} className="icon-button text-navy-600" aria-label={listening?'Stop microphone':'Use microphone'}>{listening?<MicOff size={20}/>:<Mic size={20}/>}</button><span className="text-xs text-navy-500">{listening?'Listening…':speechSupported?'Voice input':'Type to continue'}</span>{speaking&&<button type="button" className="icon-button" onClick={()=>{window.speechSynthesis.cancel();setSpeaking(false);}} aria-label="Stop reading aloud"><VolumeX size={19}/></button>}</div>{busy?<button type="button" className="btn-secondary" onClick={()=>pending.current?.abort()}><Square size={15}/>Stop</button>:<button type="submit" disabled={!input.trim()||!ai.ready||listening} className="btn-primary"><Send size={16}/>Send</button>}</div></form></div>{error&&<p role="alert" className="text-sm text-red-700">{error}</p>}{messages.length>0&&<SaveToCase kind="chat" title="Voice assistant conversation" content={messages.map(m=>`${m.role}: ${m.content}`).join('\n\n')} disabled={demoConversation} metadata={{tool:'voice_assistant'}}/>}<p className="text-xs text-navy-500 leading-relaxed">Microphone support and available voices depend on your browser. Speech recognition may use your browser provider’s servers. AI responses need review for your circumstances.</p></div></div>;
}
function MessageIcon(){return <Mic size={23}/>;}
