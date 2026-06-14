import type { GetServerSidePropsContext } from 'next';
import QuizEditor from '../../../components/QuizEditor';
import { requireAdminSSR } from '../../../lib/auth';

const NewQuiz = () => <QuizEditor />;

export async function getServerSideProps(ctx: GetServerSidePropsContext) {
  return requireAdminSSR(ctx);
}

export default NewQuiz;
