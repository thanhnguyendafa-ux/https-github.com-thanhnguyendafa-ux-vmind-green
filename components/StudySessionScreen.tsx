import React, { useState, useEffect, useMemo } from 'react';
import { StudySession, QuestionType } from '../types';
import Icon from './Icon';

interface StudySessionScreenProps {
  session: StudySession;
  onAnswer: (questionIndex: number, answer: string, isCorrect: boolean) => void;
  onEndSession: () => void;
}

const StudySessionScreen: React.FC<StudySessionScreenProps> = ({ session, onAnswer, onEndSession }) => {
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [shake, setShake] = useState(false);

  const currentQuestion = session.questions[session.currentQuestionIndex];
  const answered = session.answers[session.currentQuestionIndex] !== undefined;

  useEffect(() => {
    setCurrentAnswer('');
    setFeedback(null);
  }, [session.currentQuestionIndex]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (answered || !currentAnswer.trim()) return;

    const isCorrect = currentAnswer.trim().toLowerCase() === currentQuestion.correctAnswer.toLowerCase();
    
    setFeedback(isCorrect ? 'correct' : 'incorrect');
    onAnswer(session.currentQuestionIndex, currentAnswer, isCorrect);
    
    if (!isCorrect) {
        setShake(true);
        setTimeout(() => setShake(false), 300);
    }
  };

  const progressPercentage = ((session.currentQuestionIndex) / session.questions.length) * 100;
  
  const renderInput = () => {
    if (currentQuestion.type === QuestionType.Typing) {
      return (
        <input
          type="text"
          value={currentAnswer}
          onChange={(e) => setCurrentAnswer(e.target.value)}
          disabled={answered}
          placeholder="Type your answer..."
          className="w-full bg-slate-100 dark:bg-gray-700 border border-slate-300 dark:border-gray-600 rounded-lg px-4 py-3 text-lg text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
        />
      );
    }
    
    if (currentQuestion.type === QuestionType.MultipleChoice && currentQuestion.options) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {currentQuestion.options.map((option, index) => {
            const isSelected = currentAnswer === option;
            const isCorrect = option === currentQuestion.correctAnswer;
            let buttonClass = "bg-slate-200/70 dark:bg-gray-700 hover:bg-slate-200 dark:hover:bg-gray-600 text-slate-700 dark:text-white";
            if (answered) {
              if (isCorrect) {
                buttonClass = "bg-emerald-500/80 text-white";
              } else if (isSelected && !isCorrect) {
                buttonClass = "bg-red-500/80 text-white";
              } else {
                 buttonClass = "bg-slate-200/50 dark:bg-gray-700 opacity-60 text-slate-600 dark:text-gray-300";
              }
            }
            
            return (
              <button
                key={index}
                onClick={() => {
                    if(!answered) setCurrentAnswer(option);
                }}
                disabled={answered}
                className={`p-3 rounded-lg text-left font-medium transition-all duration-200 ${buttonClass}`}
              >
                {option}
              </button>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="fixed inset-0 bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4 animate-fadeIn transition-colors duration-300">
      <div className="w-full max-w-lg">
        <header className="w-full mb-6">
          <div className="flex justify-between items-center text-slate-500 dark:text-gray-400 mb-2">
            <span>Question {session.currentQuestionIndex + 1} of {session.questions.length}</span>
            <button onClick={onEndSession} className="hover:text-slate-800 dark:hover:text-white transition-colors">Quit</button>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
            <div className="bg-emerald-500 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progressPercentage}%` }}></div>
          </div>
        </header>
        
        <main className={`bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-lg transition-transform duration-300 ${shake ? 'animate-shake' : ''}`}>
          <p className="text-slate-500 dark:text-gray-400 mb-2 text-sm uppercase">{currentQuestion.questionSourceColumnNames.join(' + ')}</p>
          <div className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white mb-6 min-h-[40px]">
            {currentQuestion.questionText}
          </div>
          
          <form onSubmit={handleSubmit}>
            {renderInput()}
            
            <div className="mt-4 min-h-[60px]">
              {answered && feedback && (
                  <div className={`flex items-center p-3 rounded-lg animate-fadeIn ${feedback === 'correct' ? 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' : 'bg-red-500/10 text-red-700 dark:bg-red-500/20 dark:text-red-300'}`}>
                    <Icon name={feedback === 'correct' ? 'check' : 'x'} className="w-5 h-5 mr-3"/>
                    <div>
                      <p className="font-bold text-sm">{feedback === 'correct' ? 'Correct!' : 'Incorrect'}</p>
                      {feedback === 'incorrect' && <p className="text-sm">Answer: <span className="font-bold">{currentQuestion.correctAnswer}</span></p>}
                    </div>
                  </div>
              )}
            </div>

            <button
              type="submit"
              disabled={answered || !currentAnswer.trim()}
              className="w-full mt-2 bg-emerald-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {answered ? 'Next Question' : 'Check Answer'}
            </button>
          </form>
        </main>
      </div>
    </div>
  );
};

export default StudySessionScreen;