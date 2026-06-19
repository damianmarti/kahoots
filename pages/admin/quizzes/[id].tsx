import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import type { GetServerSidePropsContext } from 'next';
import QuizEditor, { EditorQuiz } from '../../../components/QuizEditor';
import { requireAdminSSR } from '../../../lib/auth';

const EditQuiz: React.FC = () => {
  const router = useRouter();
  const quizId = parseInt(router.query.id as string, 10);
  const [quiz, setQuiz] = useState<EditorQuiz | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!quizId) return;
    fetch(`/api/admin/quizzes/${quizId}`)
      .then(res => res.json())
      .then(data => {
        if (data.quiz) setQuiz(data.quiz);
        else setError(data.error || 'No se pudo cargar el cuestionario.');
      })
      .catch(() => setError('No se pudo cargar el cuestionario.'));
  }, [quizId]);

  if (error) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#d32f2f', background: '#ffebee', borderRadius: 6, padding: '14px 24px', fontWeight: 500 }}>{error}</div>
      </div>
    );
  }
  if (!quiz) {
    return <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>Cargando...</div>;
  }
  return <QuizEditor quizId={quizId} initial={quiz} />;
};

export async function getServerSideProps(ctx: GetServerSidePropsContext) {
  return requireAdminSSR(ctx);
}

export default EditQuiz;
