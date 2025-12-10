'use client';

import { useState } from 'react';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

const faqData: FAQItem[] = [
  {
    id: '1',
    question: 'Este cu adevărat gratuit?',
    answer: 'Da. Nu cerem bani. Niciodată. Nu există planuri premium sau costuri ascunse.',
  },
  {
    id: '2',
    question: 'Trebuie să-mi fac cont?',
    answer: 'Nu. Doar introduci datele (număr înmatriculare, dată ITP, telefon) și gata. Fără parolă, fără verificări.',
  },
  {
    id: '3',
    question: 'Ce date colectați?',
    answer: 'Doar numărul de înmatriculare, data expirării ITP și numărul de telefon pentru SMS. Nu vindem datele tale la nimeni. Niciodată.',
  },
  {
    id: '4',
    question: 'Cu câte zile înainte primesc SMS-ul?',
    answer: 'Primești SMS cu 7 zile înainte de expirarea ITP-ului. Suficient timp să programezi revizia tehnică.',
  },
  {
    id: '5',
    question: 'Ce se întâmplă dacă vreau să mă dezabonez?',
    answer: 'Răspunzi la SMS cu "STOP" și nu mai primești notificări. Simplu. Fără explicații.',
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const handleToggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleToggle(index);
    }
  };

  return (
    <section className="w-full py-12 md:py-20 px-4 bg-muted/30" id="faq">
      <div className="max-w-3xl mx-auto">
        {/* Section Header */}
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-8 md:mb-12 text-foreground">
          Întrebări Frecvente
        </h2>

        {/* Accordion */}
        <div className="space-y-4">
          {faqData.map((item, index) => (
            <div
              key={item.id}
              className="border-2 border-border rounded-lg overflow-hidden transition-all duration-300"
            >
              {/* Question Header */}
              <button
                onClick={() => handleToggle(index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                className="w-full flex items-center justify-between px-4 md:px-6 py-4 md:py-5 text-left bg-card hover:bg-accent/5 transition-colors duration-200"
                aria-expanded={openIndex === index}
                aria-controls={`faq-answer-${item.id}`}
              >
                <span className="text-base md:text-lg font-semibold text-foreground pr-4">
                  {item.question}
                </span>

                {/* + / - Indicator */}
                <span
                  className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-2xl font-bold text-primary transition-transform duration-300"
                  aria-hidden="true"
                  style={{
                    transform: openIndex === index ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                >
                  {openIndex === index ? '−' : '+'}
                </span>
              </button>

              {/* Answer Content */}
              <div
                id={`faq-answer-${item.id}`}
                className="overflow-hidden transition-all duration-300 ease-in-out"
                style={{
                  maxHeight: openIndex === index ? '300px' : '0',
                  opacity: openIndex === index ? 1 : 0,
                }}
              >
                <div className="px-4 md:px-6 py-4 md:py-5 bg-background/50 text-muted-foreground text-base md:text-lg leading-relaxed">
                  {item.answer}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
